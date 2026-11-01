# Data flow — platform, brand, center, student

How records move between portals and tables. All public writes use **RPC**; tenant scope from hostname → `brand_id` / `center_id`.

## Entity ownership

| Entity | Owned by | Visible to |
|--------|----------|------------|
| `platform_brand_signups` | Platform | Platform admin |
| `brands`, `brand_subscriptions` | Platform creates; brand operates | Platform + that brand |
| `franchise_inquiries` | Brand | Brand staff |
| `franchise_centers`, `domain_mappings` | Brand | Brand + that center |
| `leads` | Brand (`brand_id`); optional `center_id` | Brand (all); center (assigned/direct only) |
| `students`, `student_enrollments` | Brand (`brand_id`); center operates | Brand (all centers); center (own students) |
| `memberships` | Links `auth.users` to platform/brand/center role | RLS per scope |

## Flow 1 — New brand on EduNudg (platform)

```mermaid
sequenceDiagram
  participant V as Visitor
  participant P as Platform_host
  participant RPC as Supabase_RPC
  participant A as Platform_admin

  V->>P: submit_platform_brand_signup
  P->>RPC: platform_brand_signups pending
  A->>RPC: approve_platform_brand_signup
  Note over RPC: brands + slug-city + domain_mappings
  Note over RPC: memberships brand_owner + auth invite
  Note over RPC: brand_subscriptions draft
  RPC-->>P: abacusworld.localhost live
```

## Flow 2 — Franchise application (brand public → brand app → center host)

```mermaid
sequenceDiagram
  participant FO as Franchise_applicant
  participant B as Brand_host
  participant BA as Brand_app
  participant RPC as Supabase_RPC
  participant C as Center_host

  FO->>B: submit_franchise_inquiry_v2
  RPC->>RPC: franchise_inquiries
  BA->>RPC: approve_franchise_inquiry
  Note over RPC: franchise_centers + domain_mappings center.brand
  Note over RPC: center operator membership invite
  C-->>FO: koramangala.brand.localhost registration only
```

## Flow 3 — Student application (brand) → assign → convert (center)

```mermaid
sequenceDiagram
  participant P as Parent
  participant B as Brand_host
  participant BA as Brand_app
  participant CA as Center_app
  participant RPC as Supabase_RPC

  P->>B: submit_brand_student_application
  RPC->>RPC: leads lead_source brand center_id null
  BA->>RPC: suggest_centers_for_lead manual assign
  RPC->>RPC: center_id assigned_at
  CA->>RPC: update_lead_status contacted
  CA->>RPC: convert_lead_to_student
  RPC->>RPC: students parents enrollment
```

## Flow 4 — Student registration direct (center host)

```mermaid
sequenceDiagram
  participant P as Parent
  participant C as Center_host
  participant RPC as Supabase_RPC
  participant CA as Center_app

  P->>C: submit_center_student_registration
  RPC->>RPC: upsert_lead_by_whatsapp lead_source center
  CA->>RPC: convert_lead_to_student
```

## Flow 5 — WhatsApp merge

| Scenario | Behaviour |
|----------|-----------|
| Same WhatsApp, second brand application | Merge fields; append `lead_events` (`merged`) |
| Brand apply then center register | Set `center_id` from center payload |
| Center marks `lost` | `mark_lead_lost` + `lost_reason` — **center only** |
| Brand **reopen** | `reopen_lead` — `lost` → `new`; prior reason in `lead_events` |
| WhatsApp re-apply after `lost` | Merge fields; **auto-reopen** to `new` (`reopened_merge`; prior reason in payload) |
| Re-apply after `converted` | **Reject** with enrolled error; no duplicate enrollment |

## Flow 6 — Stale lead (brand SLA)

1. Brand assigns → `assigned_at` (IST), compute `stale_at = assigned_at + brand_settings.lead_stale_days` (default 15).
2. Center changes `leads.status` → `last_center_action_at = now()`.
3. If `now() > stale_at` and no qualifying status change since assign → show in brand **Stale leads**.
4. Brand `reassign_lead` → new center, reset assign timestamps.

## Flow 7 — Platform revenue only

```mermaid
flowchart LR
  Brand_pays[Brand pays EduNudg subscription]
  Franchise_ops[Franchise runs center]
  Brand_pays --> Platform[Platform invoices]
  Franchise_ops --> Brand_fees[Brand fees royalties kits]
  Franchise_ops -.->|no payment| Platform
```

## Flow 8 — Student portal access (learn host)

```mermaid
sequenceDiagram
  participant S as Student
  participant L as learn_brand_host
  participant RPC as Supabase_RPC
  participant CA as Center_app

  CA->>EF: student-portal-credentials (email + password)
  EF->>RPC: sync_student_portal_credentials
  S->>L: sign in at learn host
  S->>RPC: get_student_learn_home brand_id
  RPC->>RPC: resolve_student_for_learn + active enrollment
  RPC-->>L: comprehensive dashboard JSON
  S->>RPC: register_student_for_competition free only
```

Student learn data is **always** scoped to active `student_enrollments.center_id`. Paid competition enrollment shows **Coming soon** on the portal until payment integration ships. Franchise staff set/reset the learn password on `/app/students` Portal access (Edge Function `student-portal-credentials`).

## Flow 9 — Center CSV enroll existing students

```mermaid
sequenceDiagram
  participant CA as Center_app
  participant RPC as Supabase_RPC

  CA->>RPC: import_center_students
  RPC->>RPC: parents students profiles enrollment
```

Franchise staff download a template on `/app/students`, upload CSV, and `import_center_students` creates enrolled students (no lead). Optional `program_name` pins an assigned course.

## What does not cross portals

| Data | Rule |
|------|------|
| Brand A leads | Never visible to Brand B (RLS `brand_id`) |
| Center A students | Never visible to Center B (RLS `center_id`) |
| Franchise inquiries | Not on platform or center public sites |
| Kit allocations | Center + brand only; **not** student portal |

## Related

- [RPC catalog](./rpc-catalog.md)
- [Functional requirements](./functional-requirements.md)
