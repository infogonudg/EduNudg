# public-seo Specification

## Purpose

Every public marketing page is SEO-, AEO-, and GEO-ready automatically. Titles, descriptions, canonicals, Open Graph, robots, JSON-LD, sitemaps, and `llms.txt` are derived from existing landing, curriculum, legal, and franchise identity data. Brands and centers do not fill SEO forms.

## Related

- Marketing: [`docs/frontend/marketing-landing.md`](../../../docs/frontend/marketing-landing.md)
- Portal hosts: [`docs/spec/portal-host-matrix.md`](../../../docs/spec/portal-host-matrix.md)
- Tenant routing: [`.cursor/skills/edunudg-tenant-routing/SKILL.md`](../../../.cursor/skills/edunudg-tenant-routing/SKILL.md)
- Course pages: [`public-course-detail`](../public-course-detail/spec.md)
- About: [`brand-about-us`](../brand-about-us/spec.md)

## Requirements

### Requirement: Zero-touch derivation

Public SEO SHALL be derived from stored marketing content. The system SHALL NOT add per-page SEO editor fields.

#### Scenario: Homepage title and description

- **GIVEN** a brand landing with site name Digitley and hero subtitle about programs
- **WHEN** `derivePublicSeo` runs for `/`
- **THEN** the title includes the site name
- **AND** the description is taken from the hero subtitle (clipped)

#### Scenario: Center homepage is localized

- **GIVEN** a center host whose brand is Digitley and city is Pune
- **WHEN** `derivePublicSeo` runs for `/`
- **THEN** the title includes Digitley in Pune
- **AND** the canonical is the center public origin, not the brand homepage

### Requirement: Indexable public routes only

Platform `/` and `/legal/:kind`; brand `/`, `/about` (when published), `/courses/:slug`, `/legal/:kind`; center `/`, `/courses/:slug`, `/legal/:kind` SHALL be indexable. `/login`, `/auth/handoff`, `/app/*`, `/admin/*`, learn, parents, and Vercel preview deployments SHALL be `noindex`.

#### Scenario: Private routes are noindex

- **GIVEN** `/app`, `/admin`, `/login`, or a preview deployment
- **WHEN** SEO is derived
- **THEN** robots is `noindex, nofollow`

### Requirement: Canonical prefers the public host

Canonical URLs SHALL use the tenant’s preferred public origin (`VITE_PORTAL_BASE_DOMAIN` or a mapped hostname). Same-origin `?portal=` URLs SHALL NOT be the canonical when a real host exists. `applyCanonicalSiteName` SHALL NOT be treated as an HTML canonical.

#### Scenario: Vercel query URL canonicalizes to the brand host

- **GIVEN** `VITE_PORTAL_BASE_DOMAIN=example.com`
- **AND** a request on `*.vercel.app/?portal=brand&brand=digitley-pune`
- **WHEN** SEO is derived for `/`
- **THEN** the canonical is `https://digitley-pune.example.com/`

### Requirement: Discovery files

Each public host SHALL serve `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/.well-known/ai.txt` **before** the SPA catch-all. Sitemaps SHALL list published routes and course slugs only — never `/login`, homepage hashes, unpublished About, or invented `/shop` / `/contact` routes.

`/api/public-seo` SHALL resolve tenants with Node-safe same-origin helpers (`portalSameOrigin`) — it MUST NOT import browser `brandPortalUrl` (`window` / `@/` aliases). `/robots.txt` and `/.well-known/ai.txt` SHALL build from host + env only (no Supabase round-trip). Handler failures SHALL still return a plain-text robots fallback (not `FUNCTION_INVOCATION_FAILED` when the catch path runs).

Traceability: regression — `regression_public_seo_request_does_not_import_brand_portal_url`, `regression_robots_txt_builds_without_supabase_for_custom_domain`.

#### Scenario: Sitemap omits hashes and login

- **GIVEN** a brand with published courses and unpublished About
- **WHEN** `/sitemap.xml` is built
- **THEN** it lists `/` and `/courses/:slug`
- **AND** it does not list `/login`, `/about`, `#programs`, or `/shop`

### Requirement: Structured data

Indexable pages SHALL emit JSON-LD: WebSite + Organization (brand/platform), EducationalOrganization/LocalBusiness (center), Course on `/courses/:slug`, FAQPage when public FAQs exist, and BreadcrumbList on about / course / legal. FAQ schema SHALL be omitted when there are no public FAQs.

#### Scenario: Course page emits Course JSON-LD

- **GIVEN** a published course with a name and description
- **WHEN** SEO is derived for `/courses/:slug`
- **THEN** JSON-LD includes a Course named after the program

#### Scenario: Empty FAQ omits FAQPage

- **GIVEN** a homepage with no public FAQ items
- **WHEN** SEO is derived
- **THEN** JSON-LD does not include FAQPage

### Requirement: First HTML includes the tags

Production HTML for **indexable** public paths (`/`, `/about`, `/courses/:slug`, `/legal/:kind`) SHALL include the derived title, description, canonical, robots, Open Graph, and JSON-LD before JavaScript runs. The SPA SHALL keep the same tags in `PortalDocumentHead` after navigation.

### Requirement: SPA routes stay on static HTML

`/login`, `/app/*`, `/admin/*`, `/favicon.ico`, and other non-indexable SPA paths SHALL rewrite to `/index.html`. They SHALL NOT go through `/api/seo-document`. Vercel Node functions SHALL accept path-only IncomingMessage URLs and SHALL NOT crash the login page.

#### Scenario: Login is not a serverless document

- **GIVEN** a request for `/login` on the Vercel host
- **WHEN** rewrites are applied
- **THEN** the destination is `/index.html`
- **AND** it is not `/api/seo-document`

### Requirement: Vite config must load without app aliases

`vitePublicSeoPlugin` SHALL NOT statically import `@/` or `publicSeoHandlers`. Dev discovery SHALL load handlers through `ssrLoadModule` so `vite build` can load `vite.config.ts`.

#### Scenario: Plugin stays off the Vite config import graph

- **GIVEN** `vite.config.ts` registers `publicSeoDevPlugin`
- **WHEN** `vite build` loads the config
- **THEN** the plugin does not import `@/lib` or `./lib/publicSeoHandlers` at module load time
