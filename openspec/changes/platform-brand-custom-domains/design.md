## Context

`domain_mappings` has public SELECT and no client INSERT/UPDATE policies — writes go through SECURITY DEFINER RPCs. Purchased domains (e.g. `www.smartbraineducations.com`) must map to `portal_type = brand` with a real `brand_id`. Public SPA resolves via `resolve_hostname_tenant`.

## Goals / Non-Goals

**Goals:** Platform admin can add/remove brand hostnames from `/admin/brands/:slug` without SQL.  
**Non-Goals:** Domain purchase, GoDaddy automation, Vercel Domains API, center/learn subdomain editors, Mode B wildcard setup.

## Decisions

1. **RPC-only writes** — `upsert_brand_domain_mapping` / `delete_brand_domain_mapping`; `is_platform_admin()` only; `portal_type` forced to `brand`; `center_id` null.
2. **Hostname normalize** — lowercase; strip scheme, path, port, trailing dot; reject empty / invalid labels.
3. **Primary flag** — when `is_primary`, clear other primary brand mappings for that brand.
4. **UI** — Brand detail Domains card: list (existing) + add form + remove for brand rows only; show ops checklist after save.
5. **Delete safety** — only delete rows for that brand with `portal_type = brand` and `center_id IS NULL` (never wipe center/learn localhost rows from this UI).

## Risks / Trade-offs

- Mapping without Vercel/DNS still “saves” but site won’t resolve until ops finishes — mitigate with checklist copy.
- Hostname unique globally — conflict surfaces as clear RPC error.
