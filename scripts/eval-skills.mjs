#!/usr/bin/env node
// Prints the skills an eval run loaded, one per line, from its stream-JSON
// transcript. A missing transcript loaded nothing. See evals/README.md.
//
//   node scripts/eval-skills.mjs <transcript.jsonl>
import { existsSync, readFileSync } from "node:fs";

const file = process.argv[2];
const lines =
  file && existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
const skills = new Set();
for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }
  for (const block of event?.message?.content ?? []) {
    if (block?.type !== "tool_use" || block.name !== "Skill") continue;
    const name = block.input?.skill ?? block.input?.command;
    if (typeof name === "string" && name) skills.add(name);
  }
}
for (const skill of skills) console.log(skill);
