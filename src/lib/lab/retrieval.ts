/**
 * Retrieval for the fictional procedure corpus.
 *
 * METHOD, stated plainly: metadata tag matching plus literal keyword overlap
 * over 6 hand-written passages. There is no embedding model, no vector index,
 * no reranker and no agent loop anywhere in this file. The corpus is small
 * enough that exact tags beat anything statistical, and saying so is the point
 * of the lab.
 */

import {
  LAB_NO_PROCEDURE_SCENARIOS,
  LAB_PROCEDURES,
  LAB_PROCEDURE_CORPUS_VERSION,
  type LabProcedure,
  type LabScenario,
} from "./fixtures";
import { findingKinds, type LabComparison } from "./compare";

export const LAB_RETRIEVAL_METHOD =
  "applicability predicates, then metadata tag match plus literal keyword overlap over 6 fictional passages (no embeddings, no vector index, no reranking)" as const;
export const LAB_RETRIEVAL_VERSION = "lab-retrieval-1.1.0" as const;

export interface LabRetrievedPassage {
  id: string;
  title: string;
  text: string;
  tags: string[];
  score: number;
  matchedTags: string[];
  matchedKeywords: string[];
  conflictsWith: string[];
}

export interface LabRetrieval {
  method: typeof LAB_RETRIEVAL_METHOD;
  retrievalVersion: typeof LAB_RETRIEVAL_VERSION;
  corpusVersion: typeof LAB_PROCEDURE_CORPUS_VERSION;
  corpusSize: number;
  /** Tags derived from the deterministic comparison result. */
  queryTags: string[];
  queryKeywords: string[];
  passages: LabRetrievedPassage[];
  /** True when retrieval found nothing applicable. */
  noApplicableSource: boolean;
  /** True when at least two retrieved passages contradict each other. */
  conflictingSources: boolean;
}

function keywordsFrom(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3),
    ),
  );
}

function scorePassage(
  passage: LabProcedure,
  queryTags: string[],
  queryKeywords: string[],
): LabRetrievedPassage {
  const matchedTags = passage.tags.filter((t) => queryTags.includes(t));
  const passageKeywords = keywordsFrom(`${passage.title} ${passage.text}`);
  const matchedKeywords = queryKeywords.filter((k) => passageKeywords.includes(k));
  // Tags are worth more than keywords: they are curated, keywords are incidental.
  const score = matchedTags.length * 10 + matchedKeywords.length;
  return {
    id: passage.id,
    title: passage.title,
    text: passage.text,
    tags: passage.tags,
    score,
    matchedTags,
    matchedKeywords,
    conflictsWith: passage.conflictsWith ?? [],
  };
}

/** Eligibility is evaluated before relevance scoring. Unknown procedures fail closed. */
export function isProcedureApplicable(p: LabProcedure, c: LabComparison): boolean {
  if (c.inputErrors.length || !c.findings.length) return false;
  switch (p.id) {
    case "FP-101": return c.findings.some(f => f.deltaCents !== null && Math.abs(f.deltaCents) > 0 && Math.abs(f.deltaCents) < 100000);
    case "FP-102": return c.findings.some(f => f.kind === "missing_in_a" || f.kind === "missing_in_b");
    case "FP-103": return c.findings.some(f => f.kind === "status_mismatch");
    case "FP-104": return c.findings.every(f => f.kind === "match");
    case "FP-201":
    case "FP-202": return c.findings.some(f => f.statusA === "reversed" || f.statusB === "reversed");
    default: return false;
  }
}

export function retrieveProcedures(
  scenario: LabScenario,
  comparison: LabComparison,
): LabRetrieval {
  const kinds = findingKinds(comparison);
  const queryTags = [
    ...kinds.flatMap((kind) =>
      kind === "amount_and_status_mismatch" ? ["amount_mismatch", "status_mismatch"] : [kind],
    ),
    ...(scenario.extraQueryTags ?? []),
  ];
  const queryKeywords = keywordsFrom(`${scenario.question} ${scenario.notes}`);

  const forced = LAB_NO_PROCEDURE_SCENARIOS.has(scenario.id);
  const scored = forced
    ? []
    : LAB_PROCEDURES.filter((p) => isProcedureApplicable(p, comparison)).map((p) => scorePassage(p, queryTags, queryKeywords))
        .filter((p) => p.matchedTags.length > 0)
        .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
        .slice(0, 4);

  const ids = new Set(scored.map((p) => p.id));
  const conflictingSources = scored.some((p) => p.conflictsWith.some((c) => ids.has(c)));

  return {
    method: LAB_RETRIEVAL_METHOD,
    retrievalVersion: LAB_RETRIEVAL_VERSION,
    corpusVersion: LAB_PROCEDURE_CORPUS_VERSION,
    corpusSize: LAB_PROCEDURES.length,
    queryTags: Array.from(new Set(queryTags)),
    queryKeywords,
    passages: scored,
    noApplicableSource: scored.length === 0,
    conflictingSources,
  };
}

export interface LabReviewGate {
  requireHumanReview: boolean;
  allowProposedCorrection: boolean;
  reason: string;
}

/**
 * Escalation policy, decided by code before the model is ever called. Missing
 * or conflicting sources mean a human decides and the model may not propose a
 * correction.
 */
export function decideReviewGate(
  comparison: LabComparison,
  retrieval: LabRetrieval,
): LabReviewGate {
  if (comparison.inputErrors.length > 0) {
    return {
      requireHumanReview: true,
      allowProposedCorrection: false,
      reason:
        "The input data itself is rejected (duplicate ids or non-integer amounts), so no comparison can be trusted.",
    };
  }
  if (retrieval.noApplicableSource) {
    return {
      requireHumanReview: true,
      allowProposedCorrection: false,
      reason: "No fictional procedure in the corpus applies to this question.",
    };
  }
  if (retrieval.conflictingSources) {
    return {
      requireHumanReview: true,
      allowProposedCorrection: false,
      reason: "The retrieved fictional procedures contradict each other.",
    };
  }
  return {
    requireHumanReview: false,
    allowProposedCorrection: false,
    reason: "One consistent set of fictional procedures applies to the deterministic findings.",
  };
}
