# UI shell standards

Applies to authenticated **app** layouts (`/admin`, `/app`), not marketing pages.

## Backend shell & KPI dashboards

Staff portals use `AppShell` with `surface="backend"` (default) → class `ed-shell--backend` on the root shell.

All `KpiGrid` / `KpiCard` inside the backend shell use the **compact dashboard** layout automatically (~1.5 rows on desktop, room for more metrics):

- Smaller padding and type
- 5 columns from 1024px, 6 from 1280px
- Applies to platform `/admin`, `/admin/revenue`, brand `/app`, `/app/analytics`, center `/app`, and brand detail performance KPIs when viewed inside platform admin chrome

No per-page `className` on `KpiGrid` is required. Marketing/public pages do not use this shell.

`DirectoryPagination` (10 rows per page) is used on platform `/admin/brands`, `/admin/subscriptions`, and brand detail **Domains** / **Franchise centers** lists once they exceed 10 rows.

Tests: `apps/web/src/features/shared/backendKpiTheme.test.tsx`.

## Sidebar

- **Desktop:** collapsible left panel ([`packages/ui/src/shell.tsx`](../../packages/ui/src/shell.tsx)); state in `localStorage`. Center `/app` lockup shows the **franchise display name** next to the Site logo, with a smaller **by {brand}** line under it (`regression_center_shell_lockup_shows_franchise_by_brand`).
- **Tablet / mobile:** hidden by default; staff portals use a **bottom nav** plus a top bar. The mobile bar shows the tenant **logo** (`logoUrl`, typically the Site logo) beside the product name (`regression_staff_mobile_bar_shows_brand_logo`). On center `/app` that product name is the franchise display name, with **by {brand}** under it (`regression_center_shell_lockup_shows_franchise_by_brand`). Hamburger drawer is for portals that still use `mobileNavMode="drawer"`.
- Nav definitions: [`portalNav.tsx`](../../apps/web/src/lib/portalNav.tsx) — must match [navigation-spec.md](./navigation-spec.md)

## Content grid

| Breakpoint | Columns | Typical use |
|------------|---------|-------------|
| Desktop (≥1024px) | **3** | List \| detail \| actions / filters |
| Tablet (≥768px) | **2** | List + detail stacked pairs |
| Mobile (&lt;768px) | **1** | Full-width cards; exceptions: horizontal KPI scroll |

Use **`PageGrid`**, **`PageGridFull`**, and **`FormGrid`** from `@edunudg/ui` (classes `ed-page-grid`, `ed-page-grid--3`, `ed-form-grid` in `packages/ui/src/styles.css`).

```tsx
import { PageGrid, PageGridFull, FormGrid } from "@edunudg/ui";

<PageGridFull>
  <Card title="Create">…</Card>
</PageGridFull>
<PageGrid cols={3}>
  <Card title="Queue A">…</Card>
  <Card title="Queue B">…</Card>
  <Card title="All">…</Card>
</PageGrid>
```

Do not stack many full-width `Card`s in a single column on laptop viewports.

## Backend commerce workspace

Staff merchandise and inventory ops use reusable primitives from `@edunudg/ui`:

| Primitive | Use |
|-----------|-----|
| `CommercePageHeader` | Title, subtitle, primary action |
| `CommerceAlertBanner` | Payment / status alerts |
| `CommerceWorkspace` | Main column + optional aside (≥1024px two-column; stacks on tablet/mobile) |
| `CommerceSectionHeader` | Section title + badge (e.g. Last 30 Days) |
| `CommerceOrderCard` | Order history cards |
| `CommerceWidgetCard` | Sidebar widgets (allocate stock, shipping directory) |
| `CommerceStatTiles` | Compact KPI pair (stock level, avg delivery) |
| `CommerceArchiveNote` | Archived history placeholder |

Styles live in `packages/ui/src/styles.css` under **Backend commerce workspace**; work inside `ed-shell--backend` and `ed-shell--commerce`.

## Backend pipeline workspace

Staff lead, application, **and curriculum** workspaces use reusable primitives from `@edunudg/ui`:

| Primitive | Use |
|-----------|-----|
| `PipelinePageHeader` | Title, subtitle, filter/add actions |
| `PipelineMetricStrip` / `PipelineMetricCard` | KPI row (scroll on mobile, grid on desktop) |
| `PipelineWorkspace` | Lead list + detail aside (stacks on mobile when detail open) |
| `PipelinePanel` | White list container |
| `PipelineTableToolbar` | Underline tabs + pagination meta |
| `PipelineStatusBadge` | Row/detail status pills |
| `PipelineDetailPanel` | Right-hand lead detail shell |
| `PipelineTimeline` | Lead history timeline |

Row markup for center `/app/leads` uses Franchise Applications list cards (`.ed-franchise-app-list-item`): status badge, date, name, location. Center leads helpers live in `apps/web/src/lib/centerLeadsHelpers.ts`.

## Marketing (public)

- Mobile-first CSS in [`marketing.css`](../../apps/web/src/features/marketing/marketing.css)
- Dual forms on brand host stack vertically on narrow viewports
- Center registration: single column form under brand nav

## Form fields (`@edunudg/ui`)

`Input`, `PasswordInput`, `Select`, and `Textarea` generate stable `id` and `name` from labels (for autofill and a11y). Labels use `htmlFor`. Override with optional `id` / `name` props when needed.

`Input type="tel"` always wraps the native input (so typing the first digit does not remount the field or drop focus). A Call control is optional chrome after the value has digits — do not live-format or strip spaces while the staff member is typing. Regression: `regression_tel_input_does_not_remount_while_typing`.

`CentersPageHeader` `actions` sit top-right. Brand Students uses **Export CSV**; Franchise Management uses **Export Franchise** (secondary) beside **Import Franchise**.

## Accessibility

- File inputs labeled (`htmlFor`) with `name` where applicable
- Marketing editor `EditorAccordion` (`HomepageEditorShell.tsx`): title + collapse control in `<summary>` only; **Visible on site** toggle lives in the accordion body
- Stale / lost lead states use text + icon, not color alone

## Personalized welcome (staff shells)

Brand, center, platform, and learn layouts use `useStaffShellWelcome()`:

- **Display name:** `profiles.full_name` when available, else auth metadata / email local-part (`resolveStaffDisplayName` in `portalUser.ts`).
- **Greeting:** time-of-day + first name (`buildWelcomeHeading` in `welcomeMessage.ts`).
- **Subtitle:** `{portalLabel} · {action hints}` when counts are non-zero (`useShellContextCounts` + `shellActionHints`).

Pass `welcomeHeading` and `welcomeSubtitle` into `AppShell`; the legacy `Welcome back, {name}` string remains the fallback when those props are omitted.

Staff `AppShell` layouts (brand `/app`, center `/app`, platform `/admin`) pass `resetScrollKey={pathname}` so switching sidebar or bottom-nav tabs scrolls the page back to the top (window plus `.ed-content` / `.ed-main`). Test: `regression_staff_app_scrolls_to_top_on_tab_change`.

## Lead / application pipelines

Franchise applications, brand student leads, center leads, center students, center fees, center inventory, center merchandise, platform brand signups, brand/center curriculum, brand success stories, and brand merchandise share the **pipeline** pattern from `@edunudg/ui`. Brand Student Leads (`/app/leads`), Curriculum (`/app/curriculum`), Success Stories (`/app/success-stories`), Merchandise (`/app/merchandise`), and center **Leads** / **Students** / **Fees** / **Inventory** / **Merchandise** use the same workspace chrome as Franchise Applications: `PipelinePageHeader`, search + `FilterTabs`, `LeadKpiGrid`, and `PipelineWorkspace` with the list staying visible beside detail on desktop. Merchandise Catalog, Promo Codes, Orders, and Payment settings all use that list + detail workspace. Center Merchandise Shop catalog cards are horizontal (`ed-product-card--row`), one SKU per row — do not use a two-column product grid in column 1. The photo is 8rem (at least 2× the prior 3.25rem thumb) with title + price beside it (title wraps; price stays nowrap so they never overlap), then SKU and **Curriculum** / **Program**. Quantity and **Add to Order** stack in a full-width footer so the add label is not clipped at Curriculum list width. Desktop shop list/detail split matches Curriculum (`0.95fr` / `2.05fr`). Center Inventory column 1 is identity-only (name, SKU, stock badge). Column 2 is a `PipelineDetailPanel`: extra top padding on the head and body, left-aligned 50% photo beside stock facts, Curriculum/Program under the SKU, then **On the way** and **Orders** on one row, with a primary **Place New Order** `Button` — do not use a custom blue link or purple value marketing card. On Student Leads, assignment management stacks below applicant details in that detail column (do not add a third page column).

| Primitive | Use |
|-----------|-----|
| `PipelineMasterDetail` | List column + sticky detail column from 1024px |
| `PipelineWorkspace` | Persistent list + detail chrome used by Franchise Applications, brand Student Leads, Curriculum, Success Stories, Merchandise, and center Leads / Students / Fees / Inventory / Merchandise |
| `FilterTabs` | Pill filters with optional counts (replaces lone `Select`). Brand Franchise Applications and Student Leads use **Pending review** / **Decided** only. Center Leads uses Open Pipeline / Lost / Converted / All. Center Students uses All students (All on mobile) / Linked / Unassigned. Center Fees uses Invoices / Payments. Center Inventory uses All items / In stock / Low stock. Center Merchandise uses Shop / My Orders. |
| `PipelineListItem` | Avatar, title, meta, badges, relative time |
| `KpiCard` / `LeadKpiGrid` + `onClick` | KPI strip doubles as filter shortcuts. The highlighted card is the one that was clicked, even when two cards open the same tab (Approved and Rejected, Converted and Lost, Unpaid and Orders). Total does not light the first card. Franchise Applications: Pending review, Approved, Rejected, Total. Brand Student Leads: Pending review, Converted, Lost, Total. Curriculum: Active, Drafts, Programs (informational), Total. Merchandise: Active, Draft, Orders, Total. Center Leads: Open, Converted, Lost, Total. Center Students: Linked, Unassigned, Programs (informational), Total. Center Fees: Outstanding, Paid, Overdue, Total. Center Inventory: In stock, Low stock, Incoming (informational), Total. Center Merchandise: Catalog, Unpaid, Orders, Total. Success Stories: Published, Draft, With photo (informational), Total. |
| `PipelineEmptyState` | Compact empty message + optional CTA |
| `PipelineDetailPlaceholder` | Desktop hint when no row is selected |

Styles use admin theme tokens (`--ed-primary-soft`, `--ed-card`, etc.) for light and dark mode.

Pages: `FranchiseApplicationsPage`, `StudentLeadsPage`, `CenterLeadsPage`, `StudentsPage`, `FeesPage`, `InventoryPage`, `CenterMerchandiseOrdersPage`, `CurriculumWorkspace` (`/app/curriculum` and center curriculum), `BrandMerchandisePage`, `BrandsSignupReviewSection` (on `/admin/brands`; detail via `PlatformSignupDetailCard`).

Tests: `FranchiseApplicationsPage.test.tsx`, `StudentLeadsPage.test.tsx`, `CenterLeadsPage.test.tsx`, `StudentsPage.test.tsx`, `FeesPage.test.tsx`, `InventoryPage.test.tsx`, `CenterMerchandiseOrdersPage.test.tsx`, `CurriculumPage.test.tsx`, `CenterCurriculumPage.test.tsx`, `BrandMerchandisePage.test.tsx`, `BrandMerchandisePromoSection.test.tsx`, `BrandMerchandiseOrdersSection.test.tsx`, `BrandMerchandisePaymentSettings.test.tsx`, `BrandsSignupReviewSection.test.tsx`, `PlatformSignupDetailCard.test.tsx`, `welcomeMessage.test.ts`, `useShellContextCounts.test.ts`, `AppShell.responsive.test.tsx`.

## Backend catalog workspace

Staff batch and curriculum group management use reusable primitives from `@edunudg/ui`:

| Primitive | Use |
|-----------|-----|
| `CatalogPageHeader` | Breadcrumbs, title, subtitle, export/actions |
| `CatalogWorkspace` | Batch list + add/edit aside (stacks on mobile) |
| `CatalogToolbar` | Course filter pills + sort meta |
| `CatalogListCard` | Batch row with icon, status badge, meta, actions |
| `CatalogEnrollmentBadge` | Open / closed enrollment pills |
| `CatalogFormPanel` | Right-hand add/edit batch form |
| `CatalogCreateSlot` | Mobile dashed “create another” CTA |
| `CatalogFab` | Mobile add-batch floating action |

Styles live in `packages/ui/src/styles.css` under **Backend catalog workspace**. Center batch helpers: `apps/web/src/lib/centerBatchesHelpers.ts`.

Pages: `BatchesPage` (center `/app/batches`).

Tests: `BatchesPage.test.tsx`, `centerBatchesHelpers.test.ts`.

## Backend settings workspace

Staff account and public profile settings use reusable primitives from `@edunudg/ui`:

| Primitive | Use |
|-----------|-----|
| `SettingsPageHeader` | Settings page title |
| `SettingsStack` / `SettingsSection` | Card sections (account, profile) |
| `SettingsAccountLayout` | Photo + account fields grid |
| `SettingsMetaList` | Mobile account summary rows |
| `SettingsProfileBanner` | Public profile preview strip |
| `SettingsSubsection` | Contact blocks (split cards on mobile) |
| `SettingsPhoneField` | +91 prefixed phone input |
| `SettingsMapsButton` | Google Maps verify CTA |
| `SettingsSocialField` | Platform icon + URL row |
| `SettingsFormFooter` | Cancel / save actions + last-edited hint |

Styles live in `packages/ui/src/styles.css` under **Backend settings workspace**. Helpers: `apps/web/src/lib/centerSettingsHelpers.ts`.

Pages: `CenterSettingsPage` (center `/app/settings`).

Tests: `CenterSettingsPage.test.tsx`, `centerSettingsHelpers.test.ts`.

## Related

- [Navigation spec](./navigation-spec.md)
