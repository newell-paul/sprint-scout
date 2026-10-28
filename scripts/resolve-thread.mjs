#!/usr/bin/env node
// Replies to and resolves the review thread that holds a comment, so the
// dashboard's "Fixed after review" card counts the fix (docs/sdlc.md, step 11).
//
//   node scripts/resolve-thread.mjs --pr 87 --comment 4405461928 [--reply "Fixed in abc1234."]
//
// The comment ID is the REST one, the number after `discussion_r` in a
// comment link. A thread already resolved is left alone. Needs `gh` logged in;
// the repository comes from GITHUB_REPOSITORY, GH_REPO or `gh repo view`.
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const pr = Number.parseInt(option("--pr") ?? "", 10);
const comment = Number.parseInt(option("--comment") ?? "", 10);
const reply = option("--reply");

const fail = (message) => {
  console.error(`resolve-thread: ${message}`);
  process.exit(1);
};
if (!Number.isInteger(pr) || !Number.isInteger(comment))
  fail("usage: --pr <number> --comment <id> [--reply <text>]");

const gh = (ghArgs) =>
  execFileSync("gh", ghArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
const graphql = (query, fields) =>
  JSON.parse(
    gh([
      "api",
      "graphql",
      "-f",
      `query=${query}`,
      ...Object.entries(fields).flatMap(([key, value]) => [
        typeof value === "number" ? "-F" : "-f",
        `${key}=${value}`,
      ]),
    ]),
  );

const repo =
  process.env.GITHUB_REPOSITORY ||
  process.env.GH_REPO ||
  gh([
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "-q",
    ".nameWithOwner",
  ]).trim();
const [owner, name] = repo.split("/");

const { data } = graphql(
  "query($owner:String!,$name:String!,$pr:Int!){repository(owner:$owner,name:$name){pullRequest(number:$pr){reviewThreads(first:100){nodes{id isResolved comments(first:100){nodes{databaseId}}}}}}}",
  { owner, name, pr },
);
const thread = data.repository.pullRequest.reviewThreads.nodes.find((t) =>
  t.comments.nodes.some((c) => c.databaseId === comment),
);
if (!thread) fail(`no review thread on #${pr} holds comment ${comment}`);
if (thread.isResolved) {
  console.log(
    `resolve-thread: the thread of comment ${comment} is already resolved`,
  );
  process.exit(0);
}
if (reply)
  graphql(
    "mutation($thread:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$thread,body:$body}){comment{id}}}",
    { thread: thread.id, body: reply },
  );
graphql(
  "mutation($thread:ID!){resolveReviewThread(input:{threadId:$thread}){thread{isResolved}}}",
  { thread: thread.id },
);
console.log(
  `resolve-thread: resolved the thread of comment ${comment} on #${pr}`,
);
