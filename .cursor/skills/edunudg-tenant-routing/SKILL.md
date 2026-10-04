---
name: edunudg-tenant-routing
description: Host-based tenant resolution and portal routing for EduNudg.
---

# Tenant Routing

## Flow

1. `packages/tenant` resolves hostname → `domain_mappings`
2. `TenantProvider` → `resolveTenantScope` fills `brandId` via `get_portal_branding` for **brand, center, learn, and parents** (not platform only)
3. For **custom purchased domains**, call SECURITY DEFINER RPC `resolve_hostname_tenant(hostname)` (migration `108`) so **anon** gets `brand_slug` / `center_slug`. Direct `brands` SELECT is authenticated-only RLS — without the RPC, public visitors keep a fake hostname slug and load the wrong theme. Regressions: `regression_custom_domain_mapping_loads_real_brand_slug_not_hostname_label`, `regression_custom_apex_domain_scope_uses_mapped_brand_slug`.
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

- Without `VITE_PORTAL_BASE_DOMAIN`, **any** non-local host (including `*.vercel.app` and brand custom domains like `smartbraineducations.com`) uses same-origin portals via `?portal=&brand=` (`usesSameOriginPortals` in `brandPortalUrl.ts`, `portalOverride.ts`). Never emit `{center}.{brand}.localhost` from Franchise **View Frontend** / **View Backend** on those hosts.
- `TenantProvider` MUST resolve portal overrides with `syntheticLookupHostname` on same-origin hosts (not only `isPlatformHost`). Otherwise a brand custom domain ignores `?portal=center&center=…` and every franchise link shows the brand site.
- With `VITE_PORTAL_BASE_DOMAIN=example.com`, rewrite `*.localhost` mappings to `*.example.com` and use real subdomains (requires wildcard DNS on Vercel).
- Redeploy Edge Function `platform-portal-handoff` so it preserves portal query params.
- Login links MUST use `portalLoginUrl` / `learnPortalLoginUrl` (path `/login` **before** `?portal=`). Never append `/login` onto a same-origin URL that already has a query string — that produces `brand=slug/login`.
- Learn profile **Center website** MUST use `resolveCenterWebsiteUrl` (not raw RPC `center.public_url`). RPC still returns `http://*.localhost:9000/` from `domain_mappings`; the client rewrites to `/?portal=center&brand=…&center=…` on Vercel.
- Public SEO canonicals use `preferredPublicOrigin` / `derivePublicSeo` (`publicSeo.ts`). When `VITE_PORTAL_BASE_DOMAIN` is set, `*.vercel.app?portal=` is an alias — not the canonical. Center pages canonicalize to the center host, not the brand homepage. Local Vite serves `/robots.txt` `/sitemap.xml` `/llms.txt` via `publicSeoDevPlugin`.
