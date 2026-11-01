#!/usr/bin/env node
/**
 * Cursor beforeShellExecution gate for `git push`.
 * Denies push unless a recent green `pnpm ci:local` stamp exists for HEAD.
 * Node implementation so Windows agents don't failClosed on bash shebang issues.
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

function reply(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function git(root, args) {
  try {
    return execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const raw = readStdin();
let command = "";
try {
  command = String(JSON.parse(raw || "{}").command ?? "");
} catch {
  command = "";
}

if (!/\bgit\s+push\b/.test(command)) {
  reply({ permission: "allow" });
  process.exit(0);
}

if (/SKIP_CI_LOCAL=1/.test(command)) {
  reply({
    permission: "ask",
    user_message: "Push with SKIP_CI_LOCAL=1 bypasses local CI. Confirm only for emergencies.",
    agent_message:
      "SKIP_CI_LOCAL bypass requested — confirm with the user before proceeding. Never invent this flag.",
  });
  process.exit(0);
}

const root = git(process.cwd(), "rev-parse --show-toplevel");
if (!root) {
  reply({
    permission: "deny",
    agent_message:
      "Cannot resolve git root. Run from the EduNudg-hub repo, then pnpm ci:local (edunudg-pre-push-ci) before git push.",
  });
  process.exit(0);
}

const head = git(root, "rev-parse HEAD");
const stampPath = join(root, ".git", "edunudg-ci-local.ok");
const maxAgeSec = Number(process.env.CI_LOCAL_STAMP_MAX_AGE_SEC || 1800);

let hasValidStamp = false;
if (head && existsSync(stampPath)) {
  const [stampSha, stampTsRaw] = readFileSync(stampPath, "utf8").trim().split(/\s+/);
  const stampTs = Number(stampTsRaw);
  const age = Math.floor(Date.now() / 1000) - stampTs;
  if (stampSha === head && Number.isFinite(stampTs) && age >= 0 && age < maxAgeSec) {
    hasValidStamp = true;
  }
}

if (hasValidStamp) {
  reply({
    permission: "allow",
    agent_message: `Green ci:local stamp found for ${head.slice(0, 7)}. Proceeding with git push (.githooks/pre-push remains backup).`,
  });
  process.exit(0);
}

reply({
  permission: "deny",
  agent_message:
    "BLOCKED: no recent green pnpm ci:local stamp for current HEAD. Mandatory sequence (edunudg-pre-push-ci): (1) commit if the user asked, (2) run pnpm ci:local as its own shell command, (3) auto-fix failures and re-run until exit 0, (4) only then retry git push. Do not combine commit&&push without ci:local in between. Do not use SKIP_CI_LOCAL=1 unless the user explicitly approved an emergency bypass.",
});
