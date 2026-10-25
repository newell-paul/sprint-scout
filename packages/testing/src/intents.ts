export type IntentFolder = { slug: string; status: string; plan: boolean };

const fix = "set it to done or dropped in the pull request that ships it.";

// A plan.md is committed with the work, so on a merge result it means the
// work is there. Accepted without a plan is the backlog and stays legal.
export function staleIntents(folders: IntentFolder[]) {
  return folders.flatMap(({ slug, status, plan }) => {
    if (status === "in build")
      return [`intent/${slug}: Status is "in build"; ${fix}`];
    if (plan && status !== "done" && status !== "dropped")
      return [
        `intent/${slug}: has a plan.md but Status is "${status}"; ${fix}`,
      ];
    return [];
  });
}
