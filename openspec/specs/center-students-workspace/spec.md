# center-students-workspace Specification

## Purpose

Center staff manage enrolled students at `/app/students` with the same pipeline chrome as center Curriculum (`PipelinePageHeader`, KPI stats, search, filter tabs, list + detail).

## Related

- Convert mapping: FR-C13 in [`docs/spec/functional-requirements.md`](../../../docs/spec/functional-requirements.md)
- Navigation: [`docs/spec/navigation-spec.md`](../../../docs/spec/navigation-spec.md)
- Shell: [`docs/spec/ui-shell-standards.md`](../../../docs/spec/ui-shell-standards.md)
- Leads convert: [`student-leads`](../student-leads/spec.md)
- CSV enroll existing students: [`center-student-csv-import`](../center-student-csv-import/spec.md)
- Reference chrome: [`brand-curriculum-workspace`](../brand-curriculum-workspace/spec.md)

## Requirements

### Requirement: Pipeline chrome on center Students

Center staff SHALL manage enrollments at `/app/students` with the same workspace chrome as Curriculum: page header, KPI stats strip, search, filter tabs, and a list with detail beside it on desktop.

#### Scenario: Page chrome matches curriculum

- **GIVEN** a center user on `/app/students`
- **THEN** the page uses `PipelinePageHeader` + `LeadKpiGrid` like Curriculum
- **AND** stats cards show Linked, Unassigned, Programs, and Total
- **AND** Programs is informational (not a filter shortcut)
- **AND** **+ Add students** in the page header opens `/app/leads`
- **AND** **Import students** in the page header opens the CSV enroll dialog (`import_center_students`)

#### Scenario: Filter tabs and search

- **GIVEN** a center user on `/app/students`
- **THEN** filter tabs are All students (All on mobile), Linked, and Unassigned
- **AND** search matches student name or ID
- **AND** desktop keeps `PipelineWorkspace` list visible beside student detail

### Requirement: Portal access shows provided email

Center student detail **Portal access** SHALL prefill Login email with `students.login_email` when set, otherwise the parent email collected on import or add lead.

#### Scenario: Prefill from login or parent email

- **GIVEN** an enrolled student whose portal `login_email` is empty and whose parent has an email
- **WHEN** staff open that student in **Portal access**
- **THEN** Login email shows the parent email
- **AND** when `login_email` is present, that value is shown instead

#### Scenario: Copy student profile login URL

- **WHEN** franchise staff open a student on `/app/students`
- **THEN** **Portal access** has **Copy Profile URL**
- **AND** it copies the student/parent learn-portal login URL (`learnPortalLoginUrl`) to the clipboard
- **AND** the copied URL does not include a password
- **AND** on Vercel same-origin hosts with a known center the URL is `/b/{brand}/centers/{center}/student-login` (never `?portal=learn&brand=…/login`)
- **AND** without a center slug the fallback remains `/login?portal=learn&brand=…` (path before `?`)

### Requirement: Franchise Student Login nav link

Center public **Student Login** SHALL use `learnPortalLoginUrl` so local multi-host and Vercel same-origin both open the learn portal login screen.

#### Scenario: Student Login on Vercel same-origin

- **GIVEN** a franchise public site on `*.vercel.app` with a known brand and center slug
- **WHEN** a visitor clicks **Student Login**
- **THEN** the href is `/b/{brandSlug}/centers/{centerSlug}/student-login` on the same origin
- **AND** the path never appends `/login` onto a `brand=` query value

### Requirement: Delivery address save feedback

Center student **Delivery address** SHALL confirm a successful save next to **Save address**.

#### Scenario: Save address shows saved status

- **GIVEN** a center user editing a student on `/app/students`
- **WHEN** they click **Save address** and the upsert succeeds
- **THEN** the control shows **Saved** and an **Address saved.** status appears next to it

### Requirement: Delivery phone is free-form while typing

Center student **Delivery address** Phone SHALL accept the number as typed. The `Input type="tel"` wrap SHALL stay mounted for the whole edit so the field does not remount, steal focus, or strip spaces/punctuation between keystrokes. A call link MAY appear once the value has digits; it MUST NOT change the input node.

#### Scenario: Staff type a phone without live format validation

- **GIVEN** a center user editing **Delivery address** on `/app/students`
- **WHEN** they type into **Phone** (including spaces, `+`, or hyphens)
- **THEN** the field keeps the typed value and remaining focused
- **AND** the input element does not remount after the first digit
- **AND** a Call control appears only after the value contains digits
