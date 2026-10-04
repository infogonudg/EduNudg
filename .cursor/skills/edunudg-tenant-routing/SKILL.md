---
name: edunudg-tenant-routing
description: Host-based tenant resolution and portal routing for EduNudg.
---

# Tenant Routing

## Flow

1. `packages/tenant` resolves hostname → `domain_mappings`
2. `TenantProvider` → `resolveTenantScope` fills `brandId` via `get_portal_branding` for **brand, center, learn, and parents** (not platform only)
3. For **custom purchased domains** (e.g. `www.smartbraineducations.com`), after `domain_mappings` sets `brand_id` / `portal_type`, load `brands.slug` (and center slug when needed) from IDs — never keep a hostname-derived fake slug (`smartbraineducations`) or treat `www` as a center. Regression: `regression_custom_domain_mapping_loads_real_brand_slug_not_hostname_label`, `regression_custom_apex_domain_scope_uses_mapped_brand_slug`.
4. React Router mounts platform `/admin`, brand, center, or learn tree

Learn Home/Progress use `useTenant().brandId`. If learn skips branding, `brandId` stays null, queries never run, and the dashboard is blank even when a course is assigned.

## Files

- `packages/tenant/src/resolveTenant.ts`
- `apps/web/src/routes/*.tsx`
- `apps/web/vercel.json` — discovery files (`/robots.txt`, `/sitemap.xml`, `/llms.txt`) and indexable HTML (`/`, `/about`, `/courses/:slug`, `/legal/:kind` → `/api/seo-document`) **before** the SPA catch-all (`/login` and `/app` stay on `/index.html`). Do not let `/(.*)` → `index.html` swallow robots/sitemap. Never send `/login` through `/api/seo-document`.

## Local dev

- App URL: `http://localhost:9000` (fixed port; see `apps/web/vite.config.ts`)
- Use `/etc/hosts` for brand/center subdomains with `:9000`
- Or `VITE_DEFAULT_PORTAL=platform` fallback in `.env`

## Vercel / single-host

- Without `VITE_PORTAL_BASE_DOMAIN`, platform hosts (`*.vercel.app`) use same-origin portals via `?portal=&brand=` (see `brandPortalUrl.ts`, `portalOverride.ts`).
- With `VITE_PORTAL_BASE_DOMAIN=example.com`, rewrite `*.localhost` mappings to `*.example.com` and use real subdomains (requires wildcard DNS on Vercel).
- Redeploy Edge Function `platform-portal-handoff` so it preserves portal query params.
- Login links MUST use `portalLoginUrl` / `learnPortalLoginUrl` (path `/login` **before** `?portal=`). Never append `/login` onto a same-origin URL that already has a query string — that produces `brand=slug/login`.
- Learn profile **Center website** MUST use `resolveCenterWebsiteUrl` (not raw RPC `center.public_url`). RPC still returns `http://*.localhost:9000/` from `domain_mappings`; the client rewrites to `/?portal=center&brand=…&center=…` on Vercel.
- Public SEO canonicals use `preferredPublicOrigin` / `derivePublicSeo` (`publicSeo.ts`). When `VITE_PORTAL_BASE_DOMAIN` is set, `*.vercel.app?portal=` is an alias — not the canonical. Center pages canonicalize to the center host, not the brand homepage. Local Vite serves `/robots.txt` `/sitemap.xml` `/llms.txt` via `publicSeoDevPlugin`.
