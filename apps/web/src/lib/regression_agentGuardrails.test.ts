import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Regression: agent orchestration guardrails must stay present so specs, docs,
 * skills, agents, and boundaries remain discoverable and in sync.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(path.join(repoRoot, rel));
}

describe("regression_agentGuardrails", () => {
  it("always-apply sync and boundary rules exist", () => {
    expect(exists(".cursor/rules/artifact-sync.mdc")).toBe(true);
    expect(exists(".cursor/rules/agent-boundaries.mdc")).toBe(true);
    expect(exists(".cursor/rules/git-publish-gate.mdc")).toBe(true);
    const sync = read(".cursor/rules/artifact-sync.mdc");
    const bounds = read(".cursor/rules/agent-boundaries.mdc");
    const git = read(".cursor/rules/git-publish-gate.mdc");
    expect(sync).toMatch(/alwaysApply:\s*true/);
    expect(bounds).toMatch(/alwaysApply:\s*true/);
    expect(git).toMatch(/alwaysApply:\s*true/);
    expect(sync).toMatch(/edunudg-sync-artifacts/);
    expect(bounds).toMatch(/MUST NOT/);
    expect(bounds).toMatch(/git-publish-gate/);
    expect(git).toMatch(/git push/i);
    expect(git).toMatch(/explicitly/i);
  });

  it("sync skill and OpenSpec capability exist", () => {
    expect(exists(".cursor/skills/edunudg-sync-artifacts/SKILL.md")).toBe(true);
    expect(exists("openspec/specs/agent-artifact-sync/spec.md")).toBe(true);
    expect(read("openspec/specs/agent-artifact-sync/spec.md")).toMatch(/Sync surface is mandatory/);
  });

  it("agent briefs declare hard boundaries", () => {
    for (const agent of ["architect", "database", "frontend", "qa"]) {
      const body = read(`.cursor/agents/${agent}.md`);
      expect(body, agent).toMatch(/Boundary \(hard\)/);
      expect(body, agent).toMatch(/MUST NOT/);
      expect(body, agent).toMatch(/edunudg-sync-artifacts/);
    }
  });

  it("AGENTS.md and DoD require artifact sync", () => {
    const agents = read("AGENTS.md");
    const dod = read("docs/agent-playbook/definition-of-done.md");
    expect(agents).toMatch(/edunudg-sync-artifacts/);
    expect(agents).toMatch(/agent-boundaries/);
    expect(agents).toMatch(/git-publish-gate/);
    expect(agents).toMatch(/Never.*git push|git push/i);
    expect(dod).toMatch(/Artifact sync/);
    expect(dod).toMatch(/edunudg-sync-artifacts/);
    expect(dod).toMatch(/git-publish-gate/);
  });

  it("sync skill forbids push without explicit user request", () => {
    const skill = read(".cursor/skills/edunudg-sync-artifacts/SKILL.md");
    expect(skill).toMatch(/git-publish-gate|git push/i);
    expect(skill).toMatch(/explicitly/i);
  });

  it("pre-push CI skill and script mirror GitHub CI", () => {
    expect(exists(".cursor/skills/edunudg-pre-push-ci/SKILL.md")).toBe(true);
    expect(exists("scripts/ci-local.mjs")).toBe(true);
    expect(exists(".githooks/pre-push")).toBe(true);
    expect(exists(".cursor/hooks.json")).toBe(true);
    expect(exists(".cursor/hooks/gate-git-push.mjs")).toBe(true);
    expect(exists(".cursor/hooks/gate-git-push.sh")).toBe(true);
    const skill = read(".cursor/skills/edunudg-pre-push-ci/SKILL.md");
    const gate = read(".cursor/rules/git-publish-gate.mdc");
    const pkg = read("package.json");
    const hooksJson = read(".cursor/hooks.json");
    expect(skill).toMatch(/pnpm ci:local/);
    expect(skill).toMatch(/Automatically fix|auto-fix/i);
    expect(skill).toMatch(/gate-git-push/);
    expect(gate).toMatch(/edunudg-pre-push-ci/);
    expect(gate).toMatch(/ci:local/);
    expect(pkg).toMatch(/"ci:local"/);
    expect(hooksJson).toMatch(/gate-git-push\.mjs/);
    expect(hooksJson).toMatch(/beforeShellExecution/);
    const script = read("scripts/ci-local.mjs");
    expect(script).toMatch(/audit:schema/);
    expect(script).toMatch(/typecheck/);
    expect(script).toMatch(/test:rls/);
    expect(script).toMatch(/test:e2e/);
  });

  it("critical_vercel_cd_builds_remotely_for_protected_vite_env", () => {
    const cd = read(".github/workflows/cd.yml");
    expect(cd).not.toMatch(/run: vercel build/);
    expect(cd).not.toMatch(/url=.*vercel deploy --prebuilt/);
    expect(cd).toMatch(/vercel deploy --token/);
    expect(cd).toMatch(/vercel deploy --prod --token/);
  });

  it("regression_homepage_media_guardrails_prevent_legacy_seed_discard", () => {
    expect(exists(".cursor/rules/marketing-homepage-media.mdc")).toBe(true);
    const rule = read(".cursor/rules/marketing-homepage-media.mdc");
    expect(rule).toMatch(/alwaysApply:\s*true/);
    expect(rule).toMatch(/brand-assets/);
    expect(rule).toMatch(/isLegacyPlatformHomepageSeed|landing|center_landing/);
    expect(rule).toMatch(/MUST NOT/);
    expect(rule).toMatch(/brand_settings|center_landing/);
    expect(rule).toMatch(/preserveCustomMarketingMediaUrls|marketingMediaGuard|Never discard/);

    const api = read("apps/web/src/lib/homepageApi.ts");
    const enterpriseIdx = api.indexOf("hasEnterpriseBlocks");
    const customMediaIdx = api.indexOf("hasCustomMarketingMedia");
    const bgGradientIdx = api.indexOf("theme.bgGradient");
    expect(enterpriseIdx).toBeGreaterThan(-1);
    expect(customMediaIdx).toBeGreaterThan(-1);
    expect(bgGradientIdx).toBeGreaterThan(-1);
    // Enterprise / custom-media checks must win before Novu bgGradient short-circuit.
    expect(Math.min(enterpriseIdx, customMediaIdx)).toBeLessThan(bgGradientIdx);

    expect(exists("apps/web/src/lib/marketingMediaGuard.ts")).toBe(true);
    const guard = read("apps/web/src/lib/marketingMediaGuard.ts");
    expect(guard).toMatch(/preserveCustomMarketingMediaUrls/);
    expect(guard).toMatch(/hasCustomMarketingMedia/);

    const brandApi = read("apps/web/src/lib/brandLandingApi.ts");
    expect(brandApi).toMatch(/landingPartial/);

    const centerApi = read("apps/web/src/lib/centerLandingApi.ts");
    expect(centerApi).toMatch(/row\.landing/);

    const seed = read("supabase/seed/seed.sql");
    expect(seed).toMatch(/EXCLUDED\.settings \|\| brand_settings\.settings/);

    const forbidden = read("docs/agent-playbook/forbidden-patterns.md");
    expect(forbidden).toMatch(/marketing-homepage-media/);
    expect(forbidden).toMatch(/brand-assets/);

    const writeTests = read(".cursor/skills/edunudg-write-tests/SKILL.md");
    expect(writeTests).toMatch(/hasCustomPlatformMarketingMedia|marketing-homepage-media|marketingMediaGuard/);

    const frontend = read(".cursor/agents/frontend.md");
    expect(frontend).toMatch(/marketing-homepage-media/);
  });
});
