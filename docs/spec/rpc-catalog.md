# RPC catalog

All functions `SECURITY DEFINER`, `SET search_path = public`, validate tenant from slug args. Mutations call `set_row_audit()` where tables have audit columns.

## Public (anon + authenticated)

| Function | Caller host | Description |
|----------|-------------|-------------|
| `submit_platform_brand_signup(...)` | Platform | Insert `platform_brand_signups` pending |
| `get_brand_landing_public(p_brand_slug)` | Brand | Landing JSON + published success stories; **no** subscription gate on forms |
| `get_brand_success_stories_public(p_brand_slug)` | Brand | *(deprecated — use landing payload `success_stories`)* |
| `submit_franchise_inquiry_v2(...)` | Brand | Insert `franchise_inquiries` |
| `submit_brand_student_application(...)` | Brand | `upsert_lead_by_whatsapp`, `lead_source = brand` |
| `get_portal_branding(p_brand_slug, p_center_slug)` | Brand / center / learn | Login + staff chrome; logo prefers `landing.meta.logoUrl` (Site logo) then `brands.logo_url`; `center_name` prefers `franchise_centers.display_name` (migration `091`) |
| `resolve_hostname_tenant(p_hostname)` | Any (custom domain) | Hostname → `portal_type` + `brand_id`/`brand_slug` (+ center when mapped). Required for purchased domains: anon cannot `SELECT brands.slug` under RLS (`108`) |
| `get_center_landing_public(p_brand_slug, p_center_slug)` | Center | Brand logo + center blurb; curriculum limited to `center_program_enablement` |
| `submit_center_student_registration(...)` | Center | `upsert_lead_by_whatsapp`, `lead_source = center`, `center_id` set |

## Internal

| Function | Description |
|----------|-------------|
| `normalize_phone_e164(p_raw text)` | Shared validation |
| `upsert_lead_by_whatsapp(p_brand_id, p_whatsapp, p_payload jsonb)` | Insert or merge; **auto-reopen** `lost` → `new` (`reopened_merge`, prior reason in payload); **reject** if `converted`; set `center_id` if incoming center registration |

## Staff manual entry (authenticated)

| Function | Scope | Description |
|----------|-------|-------------|
| `create_platform_brand_signup_staff(...)` | Platform admin | Pending `platform_brand_signups` |
| `create_franchise_inquiry_staff(p_brand_id, ...)` | Brand | `franchise_inquiries` |
| `create_brand_student_lead_staff(p_brand_id, …)` | Brand | `leads` via upsert, `lead_source = brand`; optional CSV-aligned login/address/program fields |
| `create_center_student_lead_staff(p_center_id, …)` | Center | `leads` via upsert, `lead_source = center`; same extra fields as CSV template |

See [manual-leads.md](./manual-leads.md).

## Auth (authenticated)

| Function | Description |
|----------|-------------|
| `accept_own_invited_memberships()` | Sets the caller’s `invited` memberships to `active` on first staff login (franchise/brand invites from inquiry approval or CSV) |

## Platform admin

| Function | Description |
|----------|-------------|
| `approve_platform_brand_signup(p_signup_id)` | Brand + slug + domain + `brand_subscriptions` + **membership brand_owner** + auth invite |
| `reject_platform_brand_signup(p_signup_id, p_reason)` | |
| `purge_ephemeral_e2e_brands()` | Hard-delete `E2E Brand …` / `e2e-brand-*` tenants + `brand_subscriptions` + matching signups/audit (platform admin or service_role; never seed plans/brands) |
| `get_brand_owner_login(p_brand_id)` | Active `brand_owner` login email (platform admin) |

## Brand staff

| Function | Description |
|----------|-------------|
| `get_center_owner_login(p_center_id)` | Active `center_owner` login email (brand access or platform admin) |
| `sync_center_owner_membership(...)` | Service-role only — upsert profile + unique `center_owner` after `center-owner-credentials` |
| `sync_merchandise_catalog_programs(p_brand_id, p_catalog_item_id, p_links jsonb)` | Replace SKU curriculum links (`[{program_id, level_id}]`); franchise shop uses `center_program_enablement` |
| `list_center_active_merchandise_catalog(p_center_id)` | Active SKUs the franchise may order (`SETOF merchandise_catalog`; ignores brand-wide catalog `FOR ALL`) |
| `center_can_order_catalog_item(p_center_id, p_catalog_item_id)` | True when the SKU is active and tied to a course assigned to that franchise |
| `suggest_centers_for_lead(p_lead_id)` | Exact + near pincode list |
| `assign_lead_to_center(p_lead_id, p_center_id)` | Manual; sets `assigned_at`, `stale_at` from `lead_stale_days` + brand TZ |
| `reassign_lead(p_lead_id, p_center_id)` | Rejects if `converted`; resets SLA timestamps |
| `mark_lead_lost(p_lead_id, p_reason text)` | **Center only** — status `lost`, `lost_reason` required |
| `reopen_lead(p_lead_id)` | **Brand only** — `lost` → `new`; audit event preserves prior reason |
| `record_platform_payment(...)` | Edge/webhook — subscription payment settled |
| `create_brand_subscription_checkout(...)` | Brand billing UI — payment gateway session |
| `approve_franchise_inquiry(p_inquiry_id, ...)` | Center + `{center}.{brand}` domain + operator membership |
| `reject_franchise_inquiry(p_inquiry_id, p_reason)` | |

## Center staff

| Function | Description |
|----------|-------------|
| `update_lead_status(p_lead_id, p_status)` | Sets `last_center_action_at` |
| `convert_lead_to_student(p_lead_id, p_overrides jsonb)` | Field mapping per FR-C13; transactional; empty `child_dob` override treated as null (`094_convert_lead_empty_child_dob.sql`) |
| `import_center_students(p_center_id, p_rows jsonb)` | CSV bulk enroll; auto `STU-NNN` student_code; profile phone from WhatsApp |

## SLA computation

```sql
-- Pseudocode
v_days := brand_settings.lead_stale_days; -- default 15
v_tz := COALESCE(brand_settings.timezone, 'Asia/Kolkata');
v_stale_at := (assigned_at AT TIME ZONE v_tz + (v_days || ' days')::interval) AT TIME ZONE v_tz;
```

Stale when `now() > v_stale_at` AND (`last_center_action_at` IS NULL OR `last_center_action_at < assigned_at`) AND status NOT IN (`converted`, `lost`).

## Grants

- Public submit/get: `GRANT EXECUTE TO anon, authenticated`
- Staff RPCs: `authenticated` only; enforce `has_brand_access` / `has_center_access` inside body

## Related

- [Data model extensions](./data-model-extensions.md)
