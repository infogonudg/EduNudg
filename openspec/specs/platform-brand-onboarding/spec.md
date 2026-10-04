# platform-brand-onboarding Specification

## Purpose

How a new brand customer (e.g. Abacus World) joins EduNudg as a B2B subscriber — distinct from franchise applicants joining an existing brand. Covers public signup, platform approval, brand host provisioning, and owner access.

## Related

- Journey: [`docs/journeys/platform-brand-onboarding.md`](../../../docs/journeys/platform-brand-onboarding.md)
- Data flow: [`docs/spec/data-flow.md`](../../../docs/spec/data-flow.md) Flow 1
- Portal matrix: [`docs/spec/portal-host-matrix.md`](../../../docs/spec/portal-host-matrix.md)
- Franchise center CSV import: [`openspec/specs/franchise-center-csv-import/spec.md`](../franchise-center-csv-import/spec.md)

## Requirements

### Requirement: Public brand signup form

The platform host SHALL expose a brand signup form on `/` with fields: organization name, admin name, email, phone, city (required), country, and message.

Traceability: FR-P01

#### Scenario: Visitor submits brand signup

- **WHEN** a visitor submits the platform homepage brand signup form with all required fields
- **THEN** the system persists a pending signup via `submit_platform_brand_signup`
- **AND** no franchise or student application forms appear on the platform host

Traceability: FR-P06

#### Scenario: Duplicate admin email

- **WHEN** a second signup is submitted with the same admin email while one is already pending
- **THEN** the system does not create a duplicate pending row

Traceability: FR-P02

### Requirement: Platform admin approval

Platform admins SHALL review pending signups at `/admin/brands` via `BrandsSignupReviewSection` (master-detail queue with class `ed-brands-signup-review`) and approve them to provision a live brand. Detail actions use `PlatformSignupDetailCard`.

Traceability: FR-P03, FR-P04

#### Scenario: Approve pending signup

- **WHEN** a platform admin approves a pending brand signup from the signup review queue
- **THEN** the system creates a `brands` row with slug `slugify(name)-slugify(city)`
- **AND** creates `domain_mappings` for `{slug}.localhost:9000` (or production equivalent)
- **AND** creates a draft `brand_subscriptions` row
- **AND** creates a `brand_owner` membership and auth invite for the signup email
- **AND** the brand owner can log in at `{slug-host}/login` and reach `/app`

#### Scenario: Purchased custom domain serves the mapped brand landing

- **GIVEN** `domain_mappings` maps `www.example.com` (or apex) to a brand with slug `smart-brain-abacus` and `portal_type = brand`
- **AND** that hostname is attached to the Vercel project (DNS valid)
- **WHEN** a visitor opens `https://www.example.com`
- **THEN** the SPA SHALL resolve `brandSlug` to `smart-brain-abacus` from the mapped `brand_id` (not from the domain label)
- **AND** SHALL render that brand’s public landing (same content as `/?portal=brand&brand=smart-brain-abacus` on the platform host)
- **AND** SHALL NOT invent a brand slug from the first DNS label (e.g. `smartbraineducations`)

#### Scenario: Slug collision on approve

- **WHEN** the generated slug already exists for another brand
- **THEN** the system appends `-2`, `-3`, or higher numeric suffix after the city-suffixed base

Traceability: FR-P05

### Requirement: Brand settings identity uses Homepage landing JSON

Logo and public site name edited on `/admin/brands/:slug` SHALL persist in `brand_settings.settings.landing.meta` — the same store as `{brand}/app/homepage` Site identity. Operational fields (status, login credentials, `brands.marketing_theme`) remain on `brands` / Auth. `brands.logo_url` is a chrome copy of the Site logo, not a second source of truth.

#### Scenario: Platform logo upload shares Homepage Site logo

- **WHEN** a platform admin uploads a logo on brand detail
- **THEN** Homepage `/app/homepage` Site logo reads the same `landing.meta.logoUrl`

#### Scenario: Platform name save updates Homepage site name

- **WHEN** a platform admin changes a non-locked brand name and saves
- **THEN** `landing.meta.siteName` is set to that name
- **AND** other landing sections and feature flags are preserved

### Requirement: Brand settings save without rewriting owner credentials

Saving brand settings (name, status, marketing theme, etc.) on `/admin/brands/:slug` SHALL NOT call `brand-owner-credentials` unless the login email or password fields actually changed. Theme-only saves MUST succeed even when credential edge validation would fail.

#### Scenario: Theme save skips credentials edge function

- **WHEN** a platform admin changes **Website theme** (or other non-credential fields) and saves
- **THEN** the SPA updates marketing theme / brand fields
- **AND** does not invoke `upsertBrandOwnerCredentials` / `brand-owner-credentials`

#### Scenario: Credential fields change triggers edge function

- **WHEN** a platform admin changes login email or password and saves
- **THEN** the SPA calls `brand-owner-credentials` to create or update the owner Auth user

### Requirement: Manual platform brand signup

Platform admins SHALL be able to create pending brand signups manually from `/admin/brands` without a public form submission.

#### Scenario: Staff manual signup

- **WHEN** a platform admin creates a signup via `create_platform_brand_signup_staff`
- **THEN** a pending `platform_brand_signups` row appears in the approval queue
- **AND** the same approve flow provisions the brand

### Requirement: Platform admin brand frontend link

On `/admin/brands`, each active brand row SHALL expose a **View Frontend ↗** link that opens the brand public marketing site (`portalOriginUrl` for the brand portal) in a new tab. The slug label SHALL NOT link to the platform admin detail page.

#### Scenario: Open brand frontend from brands list

- **GIVEN** platform admin is on `/admin/brands`
- **WHEN** they click **View Frontend ↗** on a brand row
- **THEN** the browser opens `{slug}.localhost:9000/` (local dev) or the brand primary domain (production)
- **AND** the link uses `target="_blank"` with `rel="noopener noreferrer"`

#### Scenario: Open brand frontend from brand detail

- **GIVEN** platform admin is on `/admin/brands/:slug`
- **WHEN** they click **View Frontend ↗** in the page toolbar
- **THEN** the browser opens the same brand public marketing URL as the brands list link

### Requirement: Brand detail domains and centers paginate

On `/admin/brands/:slug`, **Domains** and **Franchise centers** SHALL paginate with the same directory chrome as `/admin/brands` (`DirectoryPagination`, 10 rows per page) once a list has more than 10 items.

#### Scenario: Paginate franchise centers and domains

- **GIVEN** a brand has more than 10 franchise centers or domain mappings
- **WHEN** a platform admin opens `/admin/brands/:slug`
- **THEN** each section shows the first 10 rows plus Previous / Next controls
- **AND** Next reveals the remaining rows

### Requirement: Ephemeral E2E brand hard purge

The system SHALL expose `purge_ephemeral_e2e_brands()` to permanently delete test tenants whose name matches `^E2E Brand\b` or slug matches `^e2e-brand-`, plus matching `platform_brand_signups` rows (`e2e-brand-…@example.com` / `E2E Brand …`). The same purge SHALL hard-delete matching `brand_subscriptions` (so `/admin/subscriptions` does not list E2E brands) and `platform_audit_logs` rows (by `brand_id` and/or payload `requested_name` / `email` / `slug` E2E markers). Seed slugs `abacusworld` and `smart-brain-abacus` SHALL never be deleted. Seed `subscription_plans` (starter/growth/enterprise) SHALL never be deleted. Non-CASCADE FKs (`platform_invoices`, `financial_events`, `enrollment_history`, `transfer_requests`, `support_tickets`, signup `converted_brand_id`) SHALL be cleared before brand delete. Authenticated callers MUST be platform admins; direct DB / service-role callers MAY invoke without a JWT. Playwright SHALL call this RPC via seed platform login when `DATABASE_URL` is unavailable.

#### Scenario: Purge leftover E2E brands

- **WHEN** a platform admin or service-role caller invokes `purge_ephemeral_e2e_brands()`
- **THEN** matching brands, brand subscriptions, signup rows, and platform audit log rows are hard-deleted (not soft-archived)
- **AND** seed brands and seed subscription plans remain intact
- **AND** the function returns `{ brands_deleted, signups_deleted, audit_logs_deleted, brand_subscriptions_deleted }`
