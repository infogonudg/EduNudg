# center-inventory-workspace Specification

## Purpose

Center staff track on-hand merchandise stock at `/app/inventory` with the same pipeline chrome as center Curriculum (`PipelinePageHeader`, KPI stats, search, filter tabs, list + detail).

## Related

- Navigation: [`docs/spec/navigation-spec.md`](../../../docs/spec/navigation-spec.md)
- Shell: [`docs/spec/ui-shell-standards.md`](../../../docs/spec/ui-shell-standards.md)
- Merchandise shop: [`brand-merchandise`](../brand-merchandise/spec.md)
- Reference chrome: [`brand-curriculum-workspace`](../brand-curriculum-workspace/spec.md)

## Requirements

### Requirement: Pipeline chrome on center Inventory

Center staff SHALL manage inventory at `/app/inventory` with the same workspace chrome as Curriculum: page header, KPI stats strip, search, filter tabs, and a list with item detail beside it on desktop.

#### Scenario: Page chrome matches curriculum

- **GIVEN** a center user on `/app/inventory`
- **THEN** the page uses `PipelinePageHeader` + `LeadKpiGrid` like Curriculum
- **AND** stats cards show In stock, Low stock, Incoming, and Total
- **AND** Incoming is informational (not a filter shortcut)
- **AND** Low stock counts SKUs with available units at or below the low-stock threshold
- **AND** **Export CSV** remains in the page header

#### Scenario: Filter tabs and search

- **GIVEN** a center user on `/app/inventory`
- **THEN** filter tabs are All items (All on mobile), In stock, and Low stock
- **AND** search matches item name, SKU, curriculum course, or program level
- **AND** list cards stay identity-only (name, SKU, in-stock / low-stock badge) — curriculum and stock counts live in column 2
- **AND** desktop keeps `PipelineWorkspace` list visible beside item detail (order history, incoming, inventory value)
- **AND** the item photo is left-aligned in a 50% top-row column beside stock facts
- **AND** column 2 uses `PipelineDetailPanel` with a primary `@edunudg/ui` **Place New Order** button (not a custom blue link)

#### Scenario: Detail photo is left and half width

- **GIVEN** a center user selects an inventory item with a product photo
- **WHEN** they view the second-column detail
- **THEN** the photo sits in the left 50% of the top row (`ed-inv-detail__top`)
- **AND** Available, On hand, Incoming, and Allocated sit beside the photo

#### Scenario: Incoming and orders share a row

- **GIVEN** a center user selects an inventory item
- **WHEN** they view the second-column detail on desktop
- **THEN** **On the way** and **Orders (last 6 months)** render side by side (`ed-inv-detail__split`)

#### Scenario: Detail column follows pipeline theme

- **GIVEN** a center user selects an inventory item
- **THEN** the detail column is a `PipelineDetailPanel` (title, stock badge, stock facts, incoming, orders, inventory value)
- **AND** **Place New Order** is a primary `Button` that opens `/app/merchandise`
- **AND** inventory value uses theme tokens (`--ed-border`, `--ed-fg`, `--ed-success`) rather than a purple marketing card
- **AND** the detail head and body have extra top padding so the column is not flush to the top edge

#### Scenario: List cards omit detail duplicate facts

- **GIVEN** a center user on `/app/inventory` with an item selected
- **THEN** column 1 shows the item name, SKU, and stock badge only
- **AND** column 1 does not repeat Curriculum, Program, Available, On hand, or Incoming counts from column 2

Traceability: regression — `regression_center_inventory_list_omits_detail_duplicates`.

### Requirement: Inventory lists only assigned-curriculum merchandise

Center `/app/inventory` SHALL use the same catalog visibility as Shop: `list_center_active_merchandise_catalog` for SKUs tied to `center_program_enablement`. Order history for other courses SHALL NOT create extra inventory rows.

#### Scenario: Unassigned SKUs stay off inventory

- **GIVEN** a center whose enabled programs do not include a catalog SKU
- **WHEN** they open `/app/inventory`
- **THEN** that SKU is absent even if older orders mention it

### Requirement: On-hand includes brand stock grants

Center Inventory on-hand SHALL sum received/complete bulk order lines **and** brand `merchandise_stock_grants` for that center. Grants for SKUs outside the assigned curriculum SHALL NOT create inventory rows.

#### Scenario: Brand grant increases on-hand

- **GIVEN** a brand stock grant of quantity N for an assigned-curriculum SKU at this center
- **WHEN** staff open `/app/inventory`
- **THEN** that SKU’s on-hand and available include N (minus allocations)

Traceability: regression — `regression_inventory_includes_brand_stock_grants_in_on_hand`.

### Requirement: Inventory detail shows catalog curriculum

Center `/app/inventory` SHALL show which curriculum course and program level each SKU belongs to, using the same `merchandise_catalog_programs` names as Shop.

#### Scenario: Detail names the course and level

- **GIVEN** a center SKU tagged to Abacus Core Level 1
- **WHEN** staff open `/app/inventory` and select the item
- **THEN** column 2 shows **Curriculum: Abacus Core** and **Program: Level 1**
- **AND** column 1 does not repeat those labels
- **AND** Export CSV includes Curriculum and Program columns

Traceability: regression — `regression_center_inventory_shows_catalog_curriculum`.

Traceability: regression — `regression_inventory_omits_skus_not_in_assigned_catalog`, `regression_list_active_merchandise_catalog_filters_by_center_curriculum`, `regression_list_center_active_catalog_rpc_returns_bigint_price_cents`, `regression_list_active_catalog_falls_back_when_rpc_price_type_mismatches`, `regression_center_inventory_shows_catalog_curriculum`.
