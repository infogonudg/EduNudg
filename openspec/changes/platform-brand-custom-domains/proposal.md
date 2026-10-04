## Why

Platform admins currently map purchased brand domains by running Supabase SQL. That blocks normal ops and is easy to get wrong. They need a Brand detail UI that writes the same `domain_mappings` rows so custom hostnames route to the correct brand without the SQL Editor.

## What Changes

- Add platform-admin RPCs to upsert and delete **brand** portal `domain_mappings` (hostname → brand).
- Extend `/admin/brands/:slug` **Domains** with add / remove for custom brand hostnames and a short Vercel + DNS checklist.
- Keep public resolution via existing `resolve_hostname_tenant` (migration `108`).
- Does **not** buy domains, edit GoDaddy, or call the Vercel API (ops checklist only in Phase 1).

## Capabilities

### New Capabilities

- `platform-brand-custom-domains`: Platform admin manages purchased brand hostnames on Brand detail Domains.

### Modified Capabilities

- `platform-brand-onboarding`: Brand detail Domains is no longer read-only for custom brand hostnames.

## Impact

- `supabase/migrations/109_*` RPCs + RLS tests
- `apps/web` platform Brand detail Domains UI + client helpers
- Docs: runbook domain mapping via UI
- Vercel/DNS remain manual ops after save
