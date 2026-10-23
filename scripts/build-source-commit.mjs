import { execFileSync } from "node:child_process";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function buildSourceCommit({ env = process.env, gitHead, gitDirty } = {}) {
  let checkoutHead = gitHead;
  let dirty = gitDirty;
  if (checkoutHead === undefined) {
    try {
      checkoutHead = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      dirty = Boolean(execFileSync("git", [
        "status", "--porcelain=v1", "--untracked-files=all", "--",
        "src", "package.json", "bun.lock", "vite.config.ts", "scripts",
      ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
    } catch {
      checkoutHead = null;
    }
  }

  if (dirty) return { commit: null, status: "uncommitted_source" };

  if (typeof checkoutHead === "string" && SHA_PATTERN.test(checkoutHead)) {
    return { commit: checkoutHead.toLowerCase(), status: "build_git_checkout" };
  }

  for (const name of ["GITHUB_SHA", "CF_PAGES_COMMIT_SHA"]) {
    const value = env[name];
    if (typeof value === "string" && SHA_PATTERN.test(value)) {
      return { commit: value.toLowerCase(), status: "build_environment" };
    }
  }

  return { commit: null, status: "not_available_in_lovable_build" };
}
