# brand-students-workspace Specification

## Purpose

Brand staff review every enrolled student across franchises from a read-only master-detail workspace at `/app/students`, using the same chrome as Franchise Management (`/app/centers`).

## Related

- FR-B22 in [`docs/spec/functional-requirements.md`](../../../docs/spec/functional-requirements.md)
- Navigation: [`docs/spec/navigation-spec.md`](../../../docs/spec/navigation-spec.md)
- Center enrollments: [`center-students-workspace`](../center-students-workspace/spec.md)
- Franchise chrome: [`franchise-center-management`](../franchise-center-management/spec.md)

## Requirements

### Requirement: Brand-wide student directory

Brand staff (`brand_owner`, `brand_admin`) SHALL see all active `student_enrollments` for the brand at `/app/students`, including students from every live franchise.

#### Scenario: Page chrome matches franchise management

- **GIVEN** brand staff open `/app/students`
- **THEN** the page uses `CentersPageHeader`, KPI cards, `CentersSearchField`, and a directory + detail layout like `/app/centers`
- **AND** stats cards show Total Students, Linked (portal), and Unassigned (no program)
- **AND** the Features nav includes **Students** immediately after Franchise Management

#### Scenario: Search by student or franchise

- **WHEN** brand staff type in the search field
- **THEN** the directory filters by student name, student code, franchise name, or franchise city

#### Scenario: Select student shows a detail card

- **WHEN** brand staff select a student in the directory
- **THEN** the detail card shows contact details (login email, phone, parent name/phone/email, school, address, date of birth)
- **AND** it shows franchise name and city
- **AND** it shows program, starting level, current curriculum level, and per-level progress
- **AND** the view is read-only (center staff remain the operators on `/app/students` of the franchise host)
- **AND** the directory badge matches the detail: **UNASSIGNED** when no program is set, **ACTIVE** when a program is set without a portal login, **LINKED** when a portal account exists
- **AND** a student with no program is not labelled **PENDING**

#### Scenario: Deep link opens a student

- **WHEN** brand staff open `/app/students?student={studentId}`
- **THEN** that student’s card is selected in the directory and shown in the detail panel

### Requirement: Export all-franchise student CSV

Brand staff SHALL download the full brand student roster as UTF-8 CSV from `/app/students`, including every active enrollment across franchises. Search and KPI filters SHALL NOT shrink the export.

#### Scenario: Export CSV from the page header

- **GIVEN** brand staff are on `/app/students` with enrolled students
- **WHEN** they click **Export CSV** in the top-right header
- **THEN** the browser downloads a CSV named `{brandSlug}-students-{YYYY-MM-DD}.csv`
- **AND** the file includes every enrollment (not only the filtered directory)
- **AND** rows include student identity, parent contact, address, program, current level, franchise, and portal-linked flag
- **AND** the button is disabled when the roster is empty
