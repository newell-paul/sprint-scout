// Deterministic side of spec drafts (docs/sdlc.md, step 13): which accepted
// intent gets a draft, the prompt, validation of the drafted spec.md, and
// the pull request body. The model call is claude-code-action in spec.yml;
// spec-draft.cli.ts opens the pull request from inside it.
export type IntentFile = { slug: string; text: string; hasSpec: boolean };
export type Selection = {
  slug: string | null;
  waiting: string[];
  skipped: { slug: string; reason: string }[];
};

export function intentStatus(text: string) {
  return /^Status:\s*(.+?)\s*$/m.exec(text)?.[1]?.toLowerCase() ?? null;
}

// One branch per run, so a closed pull request's branch left on the remote
// never blocks the next draft; open pull requests are matched by prefix.
export const branchPrefix = (slug: string) => `spec/${slug}/`;
export const branchFor = (slug: string, runId: string) =>
  `${branchPrefix(slug)}run-${runId}`;
export const openBranchFor = (slug: string, openBranches: string[]) =>
  openBranches.find((b) => b.startsWith(branchPrefix(slug))) ?? null;
// The slug lands in the model's write permission and a branch name.
export const validSlug = (slug: string) => /^[a-z0-9][a-z0-9-]*$/.test(slug);

export function selectCandidates(
  intents: IntentFile[],
  openBranches: string[],
): Selection {
  const skipped: Selection["skipped"] = [];
  const ready: string[] = [];
  for (const intent of [...intents].sort((a, b) =>
    a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0,
  )) {
    const status = intentStatus(intent.text);
    if (!validSlug(intent.slug))
      skipped.push({
        slug: intent.slug,
        reason: "folder name is not a-z, 0-9 and hyphens",
      });
    else if (status !== "accepted")
      skipped.push({
        slug: intent.slug,
        reason: `status is ${status ?? "missing"}`,
      });
    else if (intent.hasSpec)
      skipped.push({ slug: intent.slug, reason: "spec.md already exists" });
    else if (openBranchFor(intent.slug, openBranches))
      skipped.push({
        slug: intent.slug,
        reason: `pull request from ${openBranchFor(intent.slug, openBranches)} is open`,
      });
    else ready.push(intent.slug);
  }
  return { slug: ready[0] ?? null, waiting: ready.slice(1), skipped };
}

export function specPrompt(slug: string, intent: string, template: string) {
  return [
    `Draft intent/${slug}/spec.md for the accepted intent below, then open its pull request.`,
    "",
    "Follow AGENTS.md and the spec template from the intent skill, quoted below. Read any file in the repository you need: the code, docs/design.md, docs/test-strategy.md and earlier intent folders show how specs here are written. Do not change any file except the spec.",
    "",
    "Resolve each open question in the intent from the intent itself or from the repository, and say where the answer came from. Never guess: a question you cannot answer goes under a final `## Unresolved questions` section, one numbered item each, for the owner.",
    "",
    "The spec starts with `# Spec: <title>`, then `From [intent.md](intent.md).`, then the sections Behaviour, Data and privacy, Calculations, Tests and Docs as `##` headings.",
    "",
    `When the file is written, run \`pnpm spec:draft open\`. It validates the file and opens the pull request; if it prints errors, fix the file and run it again. Run no other command.`,
    "",
    "=== Spec template (intent skill) ===",
    template.trim(),
    "=== End of template ===",
    "",
    `=== intent/${slug}/intent.md ===`,
    intent.trim(),
    "=== End of intent ===",
  ].join("\n");
}

export const requiredSections = [
  "Behaviour",
  "Data and privacy",
  "Calculations",
  "Tests",
  "Docs",
];
const maxSpecBytes = 60_000;

export function validateSpec(text: string) {
  const errors: string[] = [];
  if (!/^# Spec: \S/m.test(text))
    errors.push("missing a `# Spec: <title>` heading");
  if (!text.includes("](intent.md)"))
    errors.push("missing the link back to `intent.md`");
  const headings = [...text.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
  for (const section of requiredSections)
    if (!headings.includes(section))
      errors.push(`missing the \`## ${section}\` section`);
  if (text.length > maxSpecBytes)
    errors.push(`longer than ${maxSpecBytes} characters`);
  return errors;
}

export function unresolvedQuestions(text: string) {
  const section =
    /^## Unresolved questions\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(
      text,
    )?.[1];
  if (!section) return [];
  return section
    .split("\n")
    .map((line) => /^\s*(?:\d+\.|-)\s+(.+)$/.exec(line)?.[1]?.trim())
    .filter((q): q is string => Boolean(q));
}

export function specTitle(text: string) {
  return /^# Spec: (.+?)\s*$/m.exec(text)?.[1] ?? "untitled";
}

export function pullRequestBody(
  slug: string,
  unresolved: string[],
  runUrl: string,
) {
  return [
    ...(unresolved.length
      ? [
          "**Unresolved questions for the owner** (this pull request stays a draft until they are answered):",
          "",
          ...unresolved.map((q, i) => `${i + 1}. ${q}`),
          "",
        ]
      : []),
    `Drafted \`intent/${slug}/spec.md\` from the accepted [intent](../blob/main/intent/${slug}/intent.md).`,
    "",
    "Edit, merge or close it. Closing it and touching the intent again drafts a fresh one.",
    "",
    `_Automated spec draft ([run](${runUrl})); see \`docs/sdlc.md\`, step 13._`,
    "",
  ].join("\n");
}
