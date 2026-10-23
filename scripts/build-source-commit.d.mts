export declare function buildSourceCommit(options?: {
  env?: Record<string, string | undefined>;
  gitHead?: string | null;
  gitDirty?: boolean;
}): { commit: string | null; status: string };
