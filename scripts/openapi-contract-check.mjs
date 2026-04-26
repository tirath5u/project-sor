#!/usr/bin/env node

const baseUrl = normalizeBaseUrl(process.env.CONTRACT_BASE_URL || "https://sor.myproduct.life");
const requestId = process.env.CONTRACT_REQUEST_ID || "openapi-contract-001";
const openapiPath = "/api/public/v1/openapi.json";
const calculatePath = "/api/public/v1/calculate";

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function urlFor(path) {
  return `${baseUrl}${path}`;
}

function fail(message, details) {
  console.error(`Contract check failed: ${message}`);
  if (details !== undefined) {
    console.error(typeof details === "string" ? details : JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

async function fetchJson(path, init) {
  const response = await fetch(urlFor(path), init);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    fail(`Expected JSON from ${path}, got status ${response.status}`, text);
  }
  return { response, body, text };
}

function resolveRef(schemas, schema) {
  if (!schema || !schema.$ref) return schema;
  const prefix = "#/components/schemas/";
  if (!schema.$ref.startsWith(prefix)) {
    fail(`Unsupported schema ref ${schema.$ref}`);
  }
  const name = schema.$ref.slice(prefix.length);
  const resolved = schemas[name];
  if (!resolved) fail(`Missing schema ${name}`);
  return resolved;
}

function assertObject(path, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${path} must be an object`, value);
  }
}

function assertType(path, value, schema, schemas) {
  const resolved = resolveRef(schemas, schema);
  if (!resolved) return;

  if (resolved.enum && !resolved.enum.includes(value)) {
    fail(`${path} must be one of ${resolved.enum.join(", ")}`, value);
  }

  switch (resolved.type) {
    case "string":
      if (typeof value !== "string") fail(`${path} must be a string`, value);
      break;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        fail(`${path} must be a finite number`, value);
      }
      break;
    case "integer":
      if (!Number.isInteger(value)) fail(`${path} must be an integer`, value);
      break;
    case "boolean":
      if (typeof value !== "boolean") fail(`${path} must be a boolean`, value);
      break;
    case "array":
      if (!Array.isArray(value)) fail(`${path} must be an array`, value);
      if (resolved.items) {
        value.forEach((item, index) => {
          const itemSchema = resolveRef(schemas, resolved.items);
          assertType(`${path}[${index}]`, item, itemSchema, schemas);
          validateRequiredFields(`${path}[${index}]`, item, itemSchema, schemas);
        });
      }
      break;
    case "object":
      assertObject(path, value);
      validateRequiredFields(path, value, resolved, schemas);
      break;
    default:
      break;
  }
}

function validateRequiredFields(path, value, schema, schemas) {
  const resolved = resolveRef(schemas, schema);
  if (!resolved?.required?.length) return;
  assertObject(path, value);

  for (const key of resolved.required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail(`${path}.${key} is documented as required but is missing`, value);
    }
    const propertySchema = resolved.properties?.[key];
    if (propertySchema) assertType(`${path}.${key}`, value[key], propertySchema, schemas);
  }
}

function validateExpectedSubset(path, actual, expected) {
  if (expected === undefined) return;

  if (expected === null || typeof expected !== "object") {
    if (actual !== expected) fail(`${path} expected ${expected} but received ${actual}`);
    return;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) fail(`${path} must be an array`, actual);
    expected.forEach((expectedItem, index) => {
      validateExpectedSubset(`${path}[${index}]`, actual[index], expectedItem);
    });
    return;
  }

  assertObject(path, actual);
  for (const [key, value] of Object.entries(expected)) {
    if (!Object.prototype.hasOwnProperty.call(actual, key)) {
      fail(`${path}.${key} is present in the documented example but missing from the response`, actual);
    }
    validateExpectedSubset(`${path}.${key}`, actual[key], value);
  }
}

const specResult = await fetchJson(openapiPath, { headers: { Accept: "application/json" } });
if (!specResult.response.ok) {
  fail(`OpenAPI fetch returned ${specResult.response.status}`, specResult.body);
}

const spec = specResult.body;
const schemas = spec.components?.schemas || {};
const calculateOperation = spec.paths?.[calculatePath]?.post;
const calculateContent = calculateOperation?.requestBody?.content?.["application/json"];
const requestExample =
  calculateContent?.examples?.firstPublishedScenario?.value || calculateContent?.example;

if (!requestExample) {
  fail("OpenAPI calculate operation is missing a request example");
}

const responseExample =
  calculateOperation?.responses?.["200"]?.content?.["application/json"]?.example;
if (!responseExample?.data) {
  fail("OpenAPI calculate operation is missing a 200 response data example");
}

if (!schemas.SORResultsStable) {
  fail("OpenAPI components.schemas.SORResultsStable is missing");
}
if (!schemas.CalculateMeta) {
  fail("OpenAPI components.schemas.CalculateMeta is missing");
}

const calculateResult = await fetchJson(calculatePath, {
  method: "POST",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  },
  body: JSON.stringify(requestExample),
});

if (calculateResult.response.status !== 200) {
  fail(`Calculate returned ${calculateResult.response.status}`, calculateResult.body);
}

const body = calculateResult.body;
validateRequiredFields("response", body, schemas.CalculateResponse, schemas);
validateRequiredFields("response.data", body.data, schemas.SORResultsStable, schemas);
validateRequiredFields("response.meta", body.meta, schemas.CalculateMeta, schemas);
validateExpectedSubset("response.data", body.data, responseExample.data);

if (body.meta.requestId !== requestId) {
  fail("Response did not echo X-Request-Id", body.meta);
}

console.log(
  `OpenAPI contract passed for ${baseUrl}: ${calculatePath} accepted the documented example and returned the documented stable fields.`,
);
