# student-leads Specification

## Purpose

Parents enter the pipeline via brand student applications or direct center registration. Brand staff assign leads to centers; center staff progress, convert, or mark leads lost. WhatsApp deduplication and SLA stale rules apply per brand.

## Related

- Journey: [`docs/journeys/prospective-student.md`](../../../docs/journeys/prospective-student.md)
- Data flow: [`docs/spec/data-flow.md`](../../../docs/spec/data-flow.md) Flows 3–6
- Manual entry: [`docs/spec/manual-leads.md`](../../../docs/spec/manual-leads.md)
- Convert mapping: FR-C13 in [`docs/spec/functional-requirements.md`](../../../docs/spec/functional-requirements.md)

## Requirements

### Requirement: Brand public student application

The brand host SHALL expose a student application with required fields: parent name, WhatsApp, email, child name, child DOB, city, and India 6-digit pincode; school name optional.

On **Abacus Classic** and **Spark Academy** themes, the application SHALL open in a dialog modal (`MarketingLeadModals`), not an inline Novu section. CTA hrefs and URL hashes `#enroll`, `#enroll-student`, and `#register` SHALL map to the enroll modal via `resolveLeadModalKind` / `LeadModalHashOpener`. The lead modal SHALL fit the device viewport: mobile near full-width single-column fields; desktop a centered card with two-column fields; modal body SHALL scroll within `100dvh` so the submit control is never clipped.

On Spark Academy, lead dialogs SHALL use Spark chrome (`ac-modal--spark`): Inter, navy headings, pill close control, navy submit, and blue focus rings. Abacus Classic SHALL keep the default `ac-modal` chrome.

#### Scenario: Spark enroll and apply modals match the theme

- **GIVEN** a Spark Academy brand public homepage
- **WHEN** a visitor opens Book a free demo class or Apply for franchise
- **THEN** the dialog uses `ac-modal--spark` with Spark Academy Inter/navy/blue tokens
- **AND** Abacus Classic dialogs do not receive that Spark class

#### Scenario: Parent applies on brand site

- **WHEN** a parent submits the student application on the brand public homepage
- **THEN** the system creates or merges a lead via `submit_brand_student_application`
- **AND** sets `lead_source = brand` with `center_id` null
- **AND** the public layout never submits with a placeholder slug such as `brand`
- **AND** Playwright Path A / Path B / merge / lost / stale submit specs skip unless `get_brand_landing_public` returns the seeded `abacusworld` tenant

#### Scenario: Lead modal fits viewport on desktop and mobile

- **WHEN** a visitor opens Book free demo / enroll on a short desktop or mobile viewport
- **THEN** the modal panel is capped to the viewport height
- **AND** the form body scrolls so the primary submit button remains reachable

#### Scenario: Deep link opens enroll modal (Abacus/Spark)

- **WHEN** a visitor opens the brand public site with hash `#enroll`, `#enroll-student`, or `#register`
- **THEN** `LeadModalHashOpener` opens the enroll modal
- **AND** submitting calls `submit_brand_student_application` (brand host, no `centerSlug`)

### Requirement: Center public student registration

The center host SHALL expose student registration only — no franchise application form.

On Abacus/Spark themes, registration SHALL use the same enroll modal with `centerSlug` set so submit calls `submit_center_student_registration` (Path B).

Traceability: FR-C01, FR-C02, FR-C03, FR-C04

#### Scenario: Parent registers on center site

- **WHEN** a parent submits registration on `{center}.{brand}` public homepage (`#register` or `#enroll-student`)
- **THEN** the system upserts a lead via `submit_center_student_registration`
- **AND** sets `lead_source = center` with `center_id` set to the hosting center
- **AND** the public nav shows the brand logo only

### Requirement: Brand student leads pipeline

Brand staff SHALL manage student leads at `/app/leads` with **Pending review** (open pipeline: unassigned, assigned, and stale) and **Decided** (lost and converted) tabs. The page SHALL use the same pipeline chrome as Franchise Applications: stats strip, search, filter tabs, and a persistent list with detail beside it on desktop.

Traceability: FR-B10

#### Scenario: Unassigned brand lead visible

- **WHEN** brand staff open Student Leads on **Pending review**
- **THEN** brand-application leads without `center_id` appear in the list
- **AND** lost and converted leads are listed on **Decided** instead

#### Scenario: Pipeline chrome matches franchise applications

- **WHEN** brand staff open Student Leads
- **THEN** the page shows a pipeline header, KPI cards (Pending review, Converted, Lost, Total), search, and **Pending review** / **Decided** tabs
- **AND** the highlighted KPI card is the one that was clicked (Converted must not light Lost)
- **AND** the lead list remains visible while a lead is selected on desktop
- **AND** search finds matching leads from any status without switching tabs
- **AND** assignment management stacks below applicant details (two-column page: list + stacked detail)
- **AND** **Recent Activity** is the last section in the detail column

#### Scenario: Lead list select includes CSV-aligned columns

- **WHEN** brand staff load Student Leads
- **THEN** the app selects `login_email`, `address_line1`, `state`, `program_name`, `starting_level`, and `notes` from `leads`
- **AND** those columns exist via migration `090_lead_csv_aligned_fields.sql` (version `089` is reserved for the merchandise SETOF RPC)

### Requirement: Pincode-based center suggestions

Brand staff SHALL receive pincode-ranked center suggestions and MUST manually confirm assignment.

Traceability: FR-B11, FR-B12

#### Scenario: Exact pincode match suggested

- **WHEN** brand staff view suggestions for a lead with a pincode
- **THEN** centers with exact pincode match are offered first
- **AND** nearby centers in the same city are ranked by last-3-digit pincode distance

#### Scenario: Manual assign override

- **WHEN** brand staff assign a lead
- **THEN** they may select any center in the brand, not only suggested centers

### Requirement: Lead stale SLA and reallocation

Brand-configured `lead_stale_days` (default 15) in brand timezone (default Asia/Kolkata) SHALL mark assigned leads stale when the center makes no qualifying status change in time.

Traceability: FR-B13, FR-B16, FR-B17

#### Scenario: Stale lead after inactivity

- **WHEN** a lead is assigned to a center and no qualifying status change occurs within `lead_stale_days`
- **THEN** the lead appears on brand **Pending review** with a NEEDS ATTENTION badge

#### Scenario: Brand reassigns stale lead

- **WHEN** brand staff reassign a stale lead to another center
- **THEN** assign timestamps reset and the new center sees the lead

### Requirement: Lost leads and reopen

Centers SHALL mark leads lost with a required reason; brands SHALL view lost leads read-only and MAY reopen them.

Traceability: FR-B14, FR-B15, FR-C11b

#### Scenario: Center marks lead lost

- **WHEN** center staff call `mark_lead_lost` with a reason
- **THEN** the lead status becomes `lost` with `lost_reason` stored
- **AND** brand staff see the lead on **Decided** with the reason
- **AND** brand staff cannot call `mark_lead_lost`

#### Scenario: Brand reopens lost lead

- **WHEN** brand staff call `reopen_lead` on a lost lead
- **THEN** the lead returns to the active pipeline
- **AND** prior `lost_reason` is preserved in `lead_events`

Traceability: FR-B15b

#### Scenario: WhatsApp re-application while lost

- **WHEN** a parent re-applies with the same WhatsApp while the lead is lost
- **THEN** fields merge into the existing lead
- **AND** status auto-reopens to `new` (`reopened_merge` event)
- **AND** prior `lost_reason` is preserved in the event payload (cleared on the lead row)
- **AND** brand may still call `reopen_lead` explicitly without a new application

### Requirement: Center leads workspace

Center staff SHALL see assigned brand leads and direct center leads at `/app/leads`.

Traceability: FR-C10

#### Scenario: Center sees only scoped leads

- **WHEN** center staff open Leads
- **THEN** they see leads assigned to their center and center-originated leads only
- **AND** they do not see unassigned brand leads or other centers' leads

#### Scenario: Center leads chrome matches curriculum

- **GIVEN** a center user on `/app/leads`
- **THEN** the page uses `PipelinePageHeader` + `LeadKpiGrid` like Curriculum
- **AND** stats cards show Open, Converted, Lost, and Total
- **AND** search and filter tabs (Open Pipeline / Lost / Converted / All) sit above `PipelineWorkspace`
- **AND** the list stays visible beside lead detail on desktop
- **AND** each lead in the list is a card (status badge, `dd/mm/yyyy` date, parent name, city/pincode) like Franchise Applications — not a cramped Parent/Student/Status table
- **AND** column 2 (`PipelineDetailPanel`) has extra top padding on the head and body (`1.5rem` / `1.75rem`)

### Requirement: Center lead status updates

Center staff SHALL update lead status (new, contacted, qualified); status changes reset the brand SLA clock.

Traceability: FR-C11

#### Scenario: Status change resets SLA

- **WHEN** center staff call `update_lead_status`
- **THEN** `last_center_action_at` is set to now
- **AND** the lead is no longer stale if within SLA rules

### Requirement: Convert lead to student

Center staff SHALL convert eligible leads to students via staff-only action; no parent self-serve link in v1.

Traceability: FR-C12, FR-C13, FR-C14

#### Scenario: Successful convert

- **WHEN** center staff convert a lead assigned to their center
- **THEN** the system creates or links parent, student, and enrollment in one RPC
- **AND** maps lead fields per FR-C13 (parent name, WhatsApp, child name/DOB, school, pincode, city, `source_lead_id`)
- **AND** sets `leads.status` to `converted`

#### Scenario: Convert without child DOB

- **WHEN** center staff convert a lead whose `child_dob` is null and the convert form sends an empty DOB override
- **THEN** `convert_lead_to_student` treats empty `child_dob` as null (not `""::date`)
- **AND** the enrollment succeeds with `students.date_of_birth` null when the lead also has no DOB
- **AND** the client MUST send `child_dob: null` for blank form values (`regression_convert_lead_empty_child_dob_sends_null_not_empty_string`)

#### Scenario: Cannot convert unassigned lead

- **WHEN** center staff attempt to convert a brand lead not assigned to their `center_id`
- **THEN** the system rejects the conversion

### Requirement: WhatsApp deduplication per brand

The system SHALL normalize WhatsApp to E.164 and merge duplicate submissions per brand.

Traceability: FR-X02

#### Scenario: Duplicate WhatsApp merges

- **WHEN** a second student application uses the same WhatsApp for the same brand
- **THEN** the system merges into the existing lead and logs `lead_events`
- **AND** if the lead is already `converted`, the RPC rejects with an enrolled error (no soft-merge, no duplicate enrollment)

### Requirement: Manual student lead entry

Staff SHALL create leads without public forms via staff RPCs. Brand **+ New Lead** and center **+ Add Lead** SHALL open a modal (`ManualStudentLeadCard`, same chrome as Add Franchise), not an inline `AddFormSection`. Fields SHALL match the student CSV import template: parent name, WhatsApp, email, student name, student date of birth, login email, school name, address line 1, city, state, pincode, program name, and starting level, plus optional notes.

#### Scenario: Brand manual unassigned lead

- **WHEN** brand staff create a lead via `create_brand_student_lead_staff`
- **THEN** an unassigned lead with `lead_source = brand` appears in Student Leads

#### Scenario: Center manual lead

- **WHEN** center staff create a lead via `create_center_student_lead_staff`
- **THEN** a lead with `lead_source = center` and `center_id` set appears in center Leads

#### Scenario: Add lead opens modal

- **WHEN** center or brand staff click **+ Add Lead** / **+ New Lead**
- **THEN** a dialog titled **Add student lead** opens
- **AND** the form includes the student CSV import template fields (student name, parent name, WhatsApp, email, student date of birth, login email, school name, address line 1, city, state, pincode, program name, starting level)
- **AND** Cancel or Close dismisses it without creating a lead

#### Scenario: Center CSV import

- **WHEN** center staff import leads via `import_center_student_leads` on `/app/leads`
- **THEN** valid rows appear in the Open Pipeline
- **AND** duplicate WhatsApp merges per brand with `csv_imported_merge` events

#### Scenario: Center bulk convert

- **WHEN** center staff confirm convert all eligible open leads
- **THEN** `bulk_convert_center_leads` enrolls leads with parent and child names
- **AND** enrolled students appear on `/app/students`

### Requirement: Ephemeral E2E student lead hard purge

The system SHALL expose `purge_ephemeral_e2e_leads()` (platform admin) and `purge_ephemeral_e2e_leads_for_brand(brand_id)` (platform admin or brand access) to permanently delete test student leads whose email matches `e2e-lead-…@example.com` (or legacy `path-a-|path-b-|lost-|merge-|stale-|manual-|neg-…@example.com`), or whose parent/child/full names match `E2E Parent` / `E2E Child` (and documented legacy E2E name patterns). Before delete, `students.source_lead_id` referencing those leads SHALL be nulled. Matching converted E2E students on seed brands MAY be hard-deleted. `lead_events` and `lead_assignment_history` cascade. Direct DB / service-role callers MAY invoke without a JWT. Playwright SHALL call these RPCs via seed login when `DATABASE_URL` is unavailable, and SHALL run a global teardown sweep.

#### Scenario: Purge leftover E2E student leads

- **WHEN** a platform admin or service-role caller invokes `purge_ephemeral_e2e_leads()`
- **THEN** matching leads on brand and center `/app/leads` are hard-deleted
- **AND** the function returns `{ leads_deleted, students_unlinked, students_deleted }`

#### Scenario: Brand-scoped E2E lead purge without DATABASE_URL

- **WHEN** Playwright cleanup signs in as brand owner and calls `purge_ephemeral_e2e_leads_for_brand` for the seed brand
- **THEN** matching E2E leads for that brand are hard-deleted even if `DATABASE_URL` is unset
