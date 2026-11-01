# Functional requirements

FR IDs for v1 franchise/student journey. Portal column: `P` platform, `B` brand, `C` center, `S` student learn.

**Canonical behavioral specs** live in [`openspec/specs/`](../../openspec/specs/). This file is a traceability index; edit OpenSpec specs when behavior changes.

---

## Platform (EduNudg)

> Canonical spec: [`openspec/specs/platform-brand-onboarding/spec.md`](../../openspec/specs/platform-brand-onboarding/spec.md)

| ID | Portal | Requirement | Acceptance |
|----|--------|-------------|------------|
| FR-P01 | P | Public marketing + **brand signup** form on `/` | Fields: org name, admin name, email, phone, **city** (required), country, message |
| FR-P02 | P | `submit_platform_brand_signup` persists pending signup | One pending row per admin email |
| FR-P03 | P | Admin approves under **Brands → Signup requests** | Approve creates brand, slug `{name}-{city}`, domain, draft subscription |
| FR-P04 | P | Approve creates **brand_owner** membership + auth invite | Signup email can log in on brand host `/app` |
| FR-P05 | P | Slug collision | Append `-2`, `-3` after city-suffixed base |
| FR-P06 | P | No franchise/student forms on platform host | QA on localhost:9000 |

---

## Brand public

> Canonical specs: [`franchise-applications`](../../openspec/specs/franchise-applications/spec.md) (FR-B01), [`student-leads`](../../openspec/specs/student-leads/spec.md) (FR-B02–B04)

| ID | Portal | Requirement | Acceptance |
|----|--------|-------------|------------|
| FR-B01 | B | Franchise application form | Extended fields: name, email, phone, franchise name, address, city, state, pincode, experience |
| FR-B02 | B | Student application form | **Required:** parent name, WhatsApp, email, child name, child DOB, **city**, **pincode** (India 6-digit), school optional |
| FR-B03 | B | Public forms without paid subscription gate | Live when brand active + domain mapped |
| FR-B04 | B | `submit_brand_student_application` sets `lead_source = brand` | `center_id` null |

---

## Brand app — Student leads

> Canonical spec: [`openspec/specs/student-leads/spec.md`](../../openspec/specs/student-leads/spec.md)

| ID | Portal | Requirement | Acceptance |
|----|--------|-------------|------------|
| FR-B10 | B | **Student Leads** nav item `/app/leads` | Lists: **Pending review** (unassigned, assigned, stale) and **Decided** (lost, converted); same pipeline chrome as Franchise Applications (KPI strip, search, persistent list + detail) |
| FR-B11 | B | Pincode suggestions | Exact → same city + 3-digit prefix → rank by last-3 distance; **manual assign only** |
| FR-B12 | B | Assign to any center in brand | Override dropdown beyond suggestions |
| FR-B13 | B | Reallocate stale leads | After configurable SLA days without center status change |
| FR-B14 | B | **Lost leads** visible with **reason** | Read-only list; shows `lost_reason` set by center |
| FR-B15 | B | **Reopen** lost lead | **Brand only** — `reopen_lead` RPC; prior `lost_reason` kept in `lead_events` |
| FR-B15b | B | WhatsApp re-application after lost | Merge **auto-reopens** lost → `new` (`reopened_merge` event; prior reason in payload). Brand may also call `reopen_lead` without a new application. Converted WhatsApp re-apply **rejects**. |
| FR-B18 | B | **Billing** — pay platform subscription | `/app/billing` via payment gateway service; updates `platform_invoices` / subscription period |
| FR-B16 | B | Configurable SLA days | `brand_settings.lead_stale_days` default **15** |
| FR-B17 | B | SLA uses brand timezone | Default `Asia/Kolkata`; stale computed in that zone |

---

## Brand app — Franchise applications

> Canonical spec: [`openspec/specs/franchise-applications/spec.md`](../../openspec/specs/franchise-applications/spec.md)

| ID | Portal | Requirement | Acceptance |
|----|--------|-------------|------------|
| FR-B20 | B | **Franchise Applications** nav `/app/franchise-applications` | Moved out of Settings |
| FR-B21 | B | Approve creates center + domain + operator invite | Same transaction: `franchise_centers`, `{center}.{brand}` mapping |
| FR-B22 | B | 360° read-only student views | Brand `/app/students` lists every active enrollment across franchises; search by student, franchise name, or city; detail card shows contact + current curriculum levels (Franchise Management chrome); **Export CSV** downloads the full roster |
| FR-B23 | B | **Curriculum** workspace `/app/curriculum` | Pipeline chrome like Franchise Applications (`PipelinePageHeader` + Active/Drafts/Programs/Total KPIs); master-detail: courses → levels → units; on/off toggle per course (`programs.is_active`); mobile overlay includes the same editable controls; parent marketing stays editable after create via Save; each course banner is stored in its own `brand-assets` folder |
| FR-B24 | B | **Merchandise** workspace `/app/merchandise` | Pipeline chrome like Franchise Applications (`PipelinePageHeader` + Active/Draft/Orders/Total KPIs); Catalog / Promo Codes / Orders / Inventory / Payment settings each use desktop list + detail; Inventory grants franchise on-hand stock without a shop order; catalog SKUs tied to curriculum courses and levels |

---

## Center public

> Canonical specs: [`student-leads`](../../openspec/specs/student-leads/spec.md) (registration), [`center-public-profile`](../../openspec/specs/center-public-profile/spec.md) (blurb, photo; footer social from brand Social Media Connect)

| ID | Portal | Requirement | Acceptance |
|----|--------|-------------|------------|
| FR-C01 | C | Student **registration** form only | No franchise form |
| FR-C02 | C | Nav shows **brand** logo only | No center logo |
| FR-C03 | C | Center blurb on page | display_name, area, contact from `franchise_centers` / profile |
| FR-C04 | C | `submit_center_student_registration` | `lead_source = center`, `center_id` set |

---

## Center app

> Canonical specs: [`student-leads`](../../openspec/specs/student-leads/spec.md), [`center-students-workspace`](../../openspec/specs/center-students-workspace/spec.md), [`center-student-csv-import`](../../openspec/specs/center-student-csv-import/spec.md), [`center-fees-workspace`](../../openspec/specs/center-fees-workspace/spec.md), [`center-inventory-workspace`](../../openspec/specs/center-inventory-workspace/spec.md), [`brand-merchandise`](../../openspec/specs/brand-merchandise/spec.md)

| ID | Portal | Requirement | Acceptance |
|----|--------|-------------|------------|
| FR-C10 | C | **Leads** `/app/leads` | Assigned + direct center leads; curriculum-style pipeline chrome (Open / Converted / Lost / Total KPIs); list cards like Franchise Applications (status, date, name, city/pincode) |
| FR-C11 | C | Status change only resets SLA | `update_lead_status` sets `last_center_action_at` |
| FR-C11b | C | **Mark lead lost** — center only | `mark_lead_lost(p_lead_id, p_reason)` — requires `lost_reason`; brand cannot call |
| FR-C12 | C | Staff-only **Convert** | No parent self-serve link v1 |
| FR-C13 | C | Convert field mapping | See [Convert mapping](#fr-c13--convert_lead_to_student-field-mapping) |
| FR-C14 | C | Cannot convert unassigned brand leads | `center_id` must match self |
| FR-C15 | C | **Students** `/app/students` | Same pipeline chrome as Curriculum (Linked / Unassigned / Programs / Total); list + detail; Delivery **Phone** is free-form while typing (no remount / live format); **Save address** shows **Saved** plus **Address saved.** next to the button; **Copy Profile URL** copies the student/parent learn-portal login URL (no password) |
| FR-C15b | C | **Import students** CSV | Template + `import_center_students`; auto `STU-NNN` code; profile phone = WhatsApp |
| FR-C16 | C | **Fees** `/app/fees` | Same pipeline chrome (Outstanding / Paid / Overdue / Total); Invoices / Payments tabs |
| FR-C17 | C | **Inventory** `/app/inventory` | Same pipeline chrome as Curriculum (In stock / Low stock / Incoming / Total); list is name / SKU / stock badge; `PipelineDetailPanel` has Curriculum/Program + stock facts + theme **Place New Order**; rows limited to assigned-curriculum SKUs; on-hand includes brand stock grants |
| FR-C18 | C | **Merchandise** `/app/merchandise` | Same pipeline chrome (Catalog / Unpaid / Orders / Total); Shop / My Orders tabs; Shop list is one horizontal card per SKU with Curriculum/Program under the SKU for curriculum assigned to that franchise |

---

## FR-C13 — `convert_lead_to_student` field mapping

| Lead column | Target | Notes |
|-------------|--------|-------|
| `parent_name` | `parents.full_name` (create/link) | Primary parent |
| `whatsapp_e164` | `parents.phone_e164` | Normalized E.164 |
| `email` | `parents.email` | If column exists or profile |
| `child_name` | `students.full_name` | |
| `child_dob` | `students.date_of_birth` | Empty override `""` MUST become null (never `""::date`) |
| `school_name` | `student_profiles.school_name` or `students` JSONB | Phase A: JSONB on student ok |
| `pincode` | `student_profiles.pincode` or lead copy on enrollment notes | |
| `city` | `student_profiles.city` | From lead |
| `login_email` | `students.login_email` | Prefers lead `login_email`, then lead `email` |
| `address_line1` | `student_profiles.address_line1` | Optional |
| `state` | `student_profiles.state` | Optional |
| `program_name` / `starting_level` | `pin_enrollment_program` | When the course is assigned to the center |
| `id` | `students.source_lead_id` | Lineage |
| — | `student_enrollments` | Created in same RPC transaction; status per product default |
| — | `leads.status` | Set to `converted` |

UI: Convert dialog shows read-only prefill; staff may add `student_code`, batch, curriculum version before submit.

---

## Cross-cutting

| ID | Portal | Requirement | Acceptance |
|----|--------|-------------|------------|
| FR-X01 | All | Default timezone **Asia/Kolkata** | Platform + brand settings; display timestamps in brand TZ |
| FR-X02 | All | WhatsApp dedup per brand | `normalize_phone_e164`; merge on duplicate |
| FR-X03 | All | RLS tenant isolation | No cross-brand / cross-center reads |
| FR-X04 | All | Public writes via RPC | No direct anon INSERT on leads |
| FR-X05 | All | Mobile-first responsive UI | Marketing + app shell breakpoints |
| FR-X06 | B,C | App layout 3/2/1 column desktop/tablet/mobile | See ui-shell-standards |
| FR-X07 | All | **Modular features** | One feature folder per capability; see services-layer |
| FR-X08 | All | **Feature flags** | Modules + integrations ON/OFF per spec |
| FR-X09 | B | **Base theme** | Screens use `@edunudg/ui` tokens/components |

---

## Student learn portal

| ID | Portal | Requirement | Acceptance |
|----|--------|-------------|------------|
| FR-S01 | S | Nav: Dashboard + Profile only | Superseded by FR-S14 for v2 |
| FR-S02 | S | Auth Google + WhatsApp OTP | Phase D |
| FR-S03 | S | Kits not visible | RLS + no routes |
| FR-S10 | S | Active center enrollment gate | `NO_ACTIVE_ENROLLMENT` without active enrollment |
| FR-S11 | S | Enrollment-scoped academic records | progress, assessments, competitions |
| FR-S12 | S | Student portal auth | `students.user_id` + invite flow |
| FR-S13 | S | Comprehensive dashboard | `get_student_learn_home` single RPC |
| FR-S14 | S | Nav: Dashboard, Progress, Events (if `competitions` on), Activity, Profile | learn.* routes |
| FR-S15 | S | Curriculum progress ladder | Pinned `curriculum_version_id` |
| FR-S16 | S | Exam visibility | `student_assessments.visible_to_student` |
| FR-S17 | S | Free competition self-enroll | `register_student_for_competition` |
| FR-S18 | S | Paid competition deferred | Coming soon UI; RPC rejects |
| FR-S19 | S | Competition results on portal | `student_competition_entries` |
| FR-S22 | S | Competition quiz | Question bank + one-attempt scored quiz when `competitions` is on |
| FR-S20 | S | Activity timeline | Derived feed on dashboard + `/activity` |
| FR-S21 | S | Profile + center transparency | Enrollment and center card |

Canonical spec: [`openspec/changes/student-learn-portal/specs/student-learn-portal/spec.md`](../../openspec/changes/student-learn-portal/specs/student-learn-portal/spec.md)

---

## Phase E (out of v1)

- FR-B30 Campaigns
- FR-C20 Kit orders / allocations
- Full assessments, reports routes

---

## Related

- [RPC catalog](./rpc-catalog.md)
- [Data flow](./data-flow.md)
- [Navigation spec](./navigation-spec.md)
