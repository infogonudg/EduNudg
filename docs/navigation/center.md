# Center Navigation (`http://{center}.{brand}.localhost:9000`)

## Public `/` (marketing landing)

**Student registration** only — brand logo in nav (no center logo), center blurb on page. Staff: `/login`. App: `/app/*`.

Details: [Portal host matrix](../spec/portal-host-matrix.md), [Prospective student journey](../journeys/prospective-student.md).

## App `/app` (authenticated)

See [Navigation spec](../spec/navigation-spec.md).

- Operations Dashboard
- **Leads** (`/app/leads`) — Curriculum-style pipeline chrome (Open / Converted / Lost / Total KPIs), search, convert, CSV import; Add student lead matches the Students CSV template fields; column 2 has extra top padding; list cards match Franchise Applications (status, date, name, city/pincode)
- **Students** (`/app/students`) — same chrome (Linked / Unassigned / Programs / Total); **Import students** CSV to enroll existing students; **Copy Profile URL** on Portal access copies the student/parent learn-portal login including `?center=` (no password); Delivery **Phone** accepts free-form typing (no live format validation); **Save address** shows **Saved** plus **Address saved.** next to the button
- **Batches & Schedule** (`/app/batches`) — only when brand feature flag `batches` is ON (default off)
- **Fees & Payments** (`/app/fees`) — same chrome (Outstanding / Paid / Overdue / Total); Invoices / Payments tabs
- **Inventory** (`/app/inventory`) — same chrome (In stock / Low stock / Incoming / Total) for SKUs tied to this franchise’s assigned curriculum; column 1 is name / SKU / stock badge only; column 2 is `PipelineDetailPanel` with Curriculum (course) and Program (level), left-aligned 50% photo beside stock facts, On the way and Orders on one row, and a theme **Place New Order** button
- **Merchandise** (`/app/merchandise`) — same chrome (Catalog / Unpaid / Orders / Total); the clicked card stays highlighted (Unpaid does not light Orders); Shop / My Orders tabs; Shop catalog is one horizontal card per SKU with Curriculum/Program under the SKU and a stacked qty / full-width **Add to Order** footer for courses assigned to this franchise; desktop list column matches Curriculum width; gated by brand `merchandise` (legacy `/app/kits` redirects)
- Staff chrome (all `/app` routes) shows the **franchise display name** next to the Site logo, with a smaller **by {brand}** line under it when the names differ
- **Settings** (`/app/settings`) — edit public center profile (photo, address, phone); login email from auth; public footer social uses brand Social Media Connect
- **Audit Logs** (`/app/audit`) — Auth + Access for this center (no Errors; IP masked). Owner/manager only.
- Assessments / Reports — Phase D
