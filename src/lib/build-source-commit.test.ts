import { describe, expect, it } from "vitest";
import { buildSourceCommit } from "../../scripts/build-source-commit.mjs";

const sha = "A".repeat(40);

describe("build source commit", () => {
  it("prefers the exact build checkout over environment metadata", () => {
    expect(buildSourceCommit({ gitHead: sha, env: { GITHUB_SHA: "b".repeat(40) } })).toEqual({
      commit: sha.toLowerCase(),
      status: "build_git_checkout",
    });
  });

  it("uses a trusted provider SHA when the checkout is unavailable", () => {
    expect(buildSourceCommit({ gitHead: null, env: { GITHUB_SHA: sha } })).toEqual({
      commit: sha.toLowerCase(),
      status: "build_environment",
    });
  });

  it("rejects stale manual values and malformed SHAs", () => {
    expect(buildSourceCommit({ gitHead: "not-a-sha", env: { VITE_COMMIT_SHA: sha } })).toEqual({
      commit: null,
      status: "not_available_in_lovable_build",
    });
  });

  it("does not attribute modified source to the previous checkout commit", () => {
    expect(buildSourceCommit({ gitHead: sha, gitDirty: true, env: {} })).toEqual({
      commit: null,
      status: "uncommitted_source",
    });
  });
});
