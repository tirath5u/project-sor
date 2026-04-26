import { createFileRoute, Link } from "@tanstack/react-router";
import type * as React from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  ExternalLink,
  FileJson2,
  GitPullRequest,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/api-docs")({
  component: ApiDocsPage,
});

const endpoints = [
  {
    method: "GET",
    path: "/api/public/v1/health",
    purpose: "Check liveness, engine version, policy year, and deployed source commit.",
  },
  {
    method: "GET",
    path: "/api/public/v1/scenarios",
    purpose: "Fetch the public parity fixture catalog with inputs, expected outputs, and source IDs.",
  },
  {
    method: "POST",
    path: "/api/public/v1/calculate",
    purpose: "Run the SOR engine against a caller supplied input payload.",
  },
  {
    method: "GET",
    path: "/api/public/v1/openapi.json",
    purpose: "Read the OpenAPI 3.1 contract for tooling and integration review.",
  },
];

const responseCodes = [
  ["200", "Calculation succeeded."],
  ["400", "Malformed JSON or unreadable request body."],
  ["405", "Wrong method. Calculate accepts POST and OPTIONS only."],
  ["406", "Client requested a non JSON response."],
  ["413", "Request body exceeds the documented size cap."],
  ["415", "Content-Type is not application/json."],
  ["422", "Well formed JSON failed the published input schema."],
  ["429", "Best effort per isolate rate limit exceeded."],
  ["500", "Unexpected calculation engine failure."],
];

const sourceStatuses = [
  {
    label: "confirmed",
    detail: "Final regulation or stable public guidance supports the rule.",
  },
  {
    label: "preliminary",
    detail: "The behavior is supported by current public guidance, but may change after final federal guidance.",
  },
];

const curlSample = `curl -X POST https://sor.myproduct.life/api/public/v1/calculate \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -H "X-Request-Id: demo-sor-001" \\
  -d "$(curl -s https://sor.myproduct.life/api/public/v1/scenarios | jq '.scenarios[0].input')"`;

const jsSample = `const scenarios = await fetch("https://sor.myproduct.life/api/public/v1/scenarios")
  .then((response) => response.json());

const calculation = await fetch("https://sor.myproduct.life/api/public/v1/calculate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Request-Id": "demo-sor-001",
  },
  body: JSON.stringify(scenarios.scenarios[0].input),
}).then((response) => response.json());

console.log(calculation.data);`;

const pythonSample = `import requests

base = "https://sor.myproduct.life/api/public/v1"
scenarios = requests.get(f"{base}/scenarios", timeout=20).json()

response = requests.post(
    f"{base}/calculate",
    json=scenarios["scenarios"][0]["input"],
    headers={"X-Request-Id": "demo-sor-001"},
    timeout=20,
)

print(response.status_code)
print(response.json()["data"])`;

function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Project SOR</span>
              <span className="block text-xs text-muted-foreground">Public API docs</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Calculator</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href="https://github.com/tirath5u/project-sor"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-border/70 bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:py-14">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Free public API</Badge>
                <Badge variant="outline">MIT licensed</Badge>
                <Badge variant="outline">Parity tested</Badge>
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                  Schedule of Reductions calculation API
                </h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  A public, source labeled implementation of the federal Direct Loan
                  Schedule of Reductions calculation. Use it to inspect inputs, replay
                  published scenarios, compare your own implementation, and challenge
                  the math with a citation.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href="#quickstart">
                    Try the API
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a
                    href="https://github.com/tirath5u/project-sor/issues/new?template=scenario-challenge.yml"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Challenge a scenario
                    <GitPullRequest className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Code2 className="h-4 w-4 text-primary" />
                First request
              </div>
              <pre className="overflow-x-auto rounded-md bg-foreground p-4 text-xs leading-6 text-background">
                <code>{`curl https://sor.myproduct.life/api/public/v1/health`}</code>
              </pre>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                The API is anonymous, requires no key, and returns JSON for every
                successful response and handled error.
              </p>
            </div>
          </div>
        </section>

        <section id="quickstart" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="mb-5 flex items-center gap-2">
            <FileJson2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-normal">Quickstart</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <CodePanel title="cURL" code={curlSample} />
            <CodePanel title="JavaScript" code={jsSample} />
            <CodePanel title="Python" code={pythonSample} />
          </div>
        </section>

        <section className="border-y border-border/70 bg-muted/25">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="mb-5 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold tracking-normal">Endpoint Reference</h2>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Path</th>
                    <th className="px-4 py-3 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((endpoint) => (
                    <tr key={endpoint.path} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <span className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{endpoint.path}</td>
                      <td className="px-4 py-3 text-muted-foreground">{endpoint.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2">
          <InfoSection
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
            title="Response Contract"
          >
            <p>
              Successful calculations return a `data` block from the shared engine and
              a `meta` block with `engineVersion`, `policyYear`,
              `policySnapshotDate`, `sourceCommit`, `policyStatus`, `sourceSet`,
              `citations`, `computedAt`, and `requestId`.
            </p>
            <p>
              The live API sets `Cache-Control: no-store` and supports a caller
              supplied `X-Request-Id` for reproducible issue reports.
            </p>
          </InfoSection>

          <InfoSection
            icon={<HeartHandshake className="h-5 w-5 text-primary" />}
            title="Rate Limits And Safety"
          >
            <p>
              The public API is free and anonymous with a best effort limit of 30
              requests per minute per client fingerprint. The limiter uses a daily
              salted hash so raw IPs are not stored by the application.
            </p>
            <p>
              This is an educational and validation tool, not an official ED
              calculator, legal advice, or an institutional policy substitute.
            </p>
          </InfoSection>
        </section>

        <section className="border-y border-border/70 bg-muted/25">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="mb-5 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold tracking-normal">Validation Codes</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {responseCodes.map(([code, label]) => (
                  <div key={code} className="rounded-lg border border-border bg-background p-3">
                    <div className="font-mono text-sm font-semibold text-primary">{code}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-5 flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold tracking-normal">Source Status</h2>
              </div>
              <div className="space-y-3">
                {sourceStatuses.map((status) => (
                  <div key={status.label} className="rounded-lg border border-border bg-background p-4">
                    <Badge variant={status.label === "confirmed" ? "default" : "outline"}>
                      {status.label}
                    </Badge>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{status.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-normal">Challenge The Calculation</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  If a published scenario or API response looks wrong, open a Scenario
                  Challenge with the exact input JSON, observed output, expected output,
                  and a public regulatory citation. Accepted challenges become fixtures
                  first, then code changes.
                </p>
              </div>
              <Button asChild>
                <a
                  href="https://github.com/tirath5u/project-sor/issues/new?template=scenario-challenge.yml"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open challenge
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function CodePanel({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <pre className="max-h-[360px] overflow-auto rounded-md bg-foreground p-4 text-xs leading-6 text-background">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function InfoSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}
