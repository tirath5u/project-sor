import { PARITY_FIXTURES } from "@/lib/sor.fixtures";
import { CalculateV2InputSchema } from "@/lib/sor-v2-contract";
import { runCanonicalV2 } from "@/lib/phase-b";

export const APPROVED_MIGRATION_FIXTURE_IDS = ["fixture-v19-007"] as const;
export type ApprovedMigrationFixtureId = (typeof APPROVED_MIGRATION_FIXTURE_IDS)[number];

type MigrationMetric =
  | "sorPctRounded"
  | "reducedSub"
  | "reducedUnsub"
  | "reducedGradPlus"
  | "totalFinalSub"
  | "totalFinalUnsub"
  | "totalFinalGradPlus";

const MIGRATION_METRICS: MigrationMetric[] = [
  "sorPctRounded",
  "reducedSub",
  "reducedUnsub",
  "reducedGradPlus",
  "totalFinalSub",
  "totalFinalUnsub",
  "totalFinalGradPlus",
];

const V55_BASELINES: Record<ApprovedMigrationFixtureId, Record<MigrationMetric, number>> = {
  "fixture-v19-007": {
    sorPctRounded: 0.78,
    reducedSub: 0,
    reducedUnsub: 15990,
    reducedGradPlus: 11310,
    totalFinalSub: 0,
    totalFinalUnsub: 15990,
    totalFinalGradPlus: 11310,
  },
};

export interface MigrationComparison {
  fixture: {
    id: ApprovedMigrationFixtureId;
    description: string;
    sourceRefs: string[];
    baselineSource: "approved-v55-fixture";
  };
  v55: {
    engineVersion: "1.1.0";
    metrics: Record<MigrationMetric, number>;
  };
  v56: {
    engineVersion: "1.3.1";
    status: string;
    authoritative: boolean;
    metrics: Record<MigrationMetric, number | null>;
    warnings: ReturnType<typeof runCanonicalV2>["warnings"];
    externalChecks: string[];
  };
  changes: Record<MigrationMetric, { v55: number; v56: number | null; delta: number | null }>;
  changedMetrics: MigrationMetric[];
  stateless: true;
}

function isApprovedFixtureId(value: string): value is ApprovedMigrationFixtureId {
  return (APPROVED_MIGRATION_FIXTURE_IDS as readonly string[]).includes(value);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getApprovedMigrationFixtures() {
  return APPROVED_MIGRATION_FIXTURE_IDS.map((id) => {
    const fixture = PARITY_FIXTURES.find((candidate) => candidate.id === id);
    if (!fixture) throw new Error(`Approved migration fixture is missing: ${id}`);
    return {
      id,
      description: fixture.description,
      sourceRefs: fixture.sourceRefs,
    };
  });
}

export function compareApprovedMigrationFixture(fixtureId: string): MigrationComparison | null {
  if (!isApprovedFixtureId(fixtureId)) return null;
  const fixture = PARITY_FIXTURES.find((candidate) => candidate.id === fixtureId);
  if (!fixture) throw new Error(`Approved migration fixture is missing: ${fixtureId}`);

  const v56 = runCanonicalV2(CalculateV2InputSchema.parse(fixture.input));
  const v55 = V55_BASELINES[fixtureId];
  const metrics = Object.fromEntries(
    MIGRATION_METRICS.map((metric) => [metric, numberOrNull(v56.data[metric])]),
  ) as Record<MigrationMetric, number | null>;
  const changes = Object.fromEntries(
    MIGRATION_METRICS.map((metric) => {
      const current = metrics[metric];
      return [
        metric,
        {
          v55: v55[metric],
          v56: current,
          delta: current === null ? null : current - v55[metric],
        },
      ];
    }),
  ) as MigrationComparison["changes"];

  return {
    fixture: {
      id: fixtureId,
      description: fixture.description,
      sourceRefs: fixture.sourceRefs,
      baselineSource: "approved-v55-fixture",
    },
    v55: { engineVersion: "1.1.0", metrics: v55 },
    v56: {
      engineVersion: "1.3.1",
      status: v56.status,
      authoritative: v56.authoritative,
      metrics,
      warnings: v56.warnings,
      externalChecks: v56.normalized.externalChecks,
    },
    changes,
    changedMetrics: MIGRATION_METRICS.filter((metric) => changes[metric].delta !== 0),
    stateless: true,
  };
}
