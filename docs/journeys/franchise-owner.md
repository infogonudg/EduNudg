# Journey: Prospective franchise owner

Applies to **brand host** public form and **brand app** approval — not EduNudg platform signup.

## Actors

- **Franchise applicant** — wants to open a center under a brand (e.g. Abacus World)
- **Brand owner** — reviews applications, approves, provisions center

## Flow

```mermaid
flowchart LR
  A[Apply on brand site] --> B[Brand reviews application]
  B --> C[Approve inquiry]
  C --> D[Center record + domain + operator invite]
  D --> E[Franchise uses center /app]
```

## Steps

1. Visitor opens `http://{brand}.localhost:9000/` → **Franchise application** (`#apply`; Abacus/Spark open the apply modal via `LeadModalHashOpener`).
2. Submit (name, email, and a valid India mobile/WhatsApp required — letters/short junk rejected) → `submit_franchise_inquiry_v2` → `franchise_inquiries`.
3. Brand owner opens **Franchise Applications** (`/app/franchise-applications`).
4. **Approve** → single RPC transaction:
   - `franchise_centers` row (slug from proposed name)
   - `domain_mappings`: `{center_slug}.{brand_slug}.localhost`
   - Center operator membership + auth invite
5. Franchise operator logs in on **center host** `/app` — sidebar lockup shows the **franchise display name** next to the Site logo with **by {brand}** underneath; Leads, Students, Fees, Inventory, and Merchandise share Curriculum pipeline chrome (header, KPI stats, search, list + detail). Existing students can be bulk-enrolled from **Students** → **Import students** ([ops](../ops/center-student-csv-import.md)). **Copy Profile URL** on student Portal access shares the learn-portal login (no password) with parents.

## Success criteria

- Applicant never uses platform or center public forms to apply.
- Center URL works immediately after approval.
- Franchise does not pay EduNudg.

## Related

- [Brand operator](./brand-operator.md)
- [Portal matrix](../spec/portal-host-matrix.md)
