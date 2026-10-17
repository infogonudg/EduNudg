# brand-success-stories Specification

## Purpose

Brand staff manage testimonial quotes at `/app/success-stories`. Published rows feed the public marketing site testimonials carousel.

## Related

- Navigation: [`docs/spec/navigation-spec.md`](../../../docs/spec/navigation-spec.md)
- Marketing: [`docs/frontend/marketing-landing.md`](../../../docs/frontend/marketing-landing.md)
- UI: [`docs/spec/ui-shell-standards.md`](../../../docs/spec/ui-shell-standards.md)

## Requirements

### Requirement: Pipeline chrome on Success Stories

Brand staff SHALL manage success stories at `/app/success-stories` with the same pipeline chrome as Franchise Applications: page header, KPI stats strip, search, filter tabs, and a persistent list with detail beside it on desktop.

#### Scenario: Page chrome matches franchise applications

- **GIVEN** a brand user on `/app/success-stories`
- **THEN** the page uses `PipelinePageHeader` + `LeadKpiGrid` + search + `FilterTabs` + `PipelineWorkspace`
- **AND** stats cards show Published, Draft, With photo, and Total
- **AND** clicking Total highlights Total (it must not light Published)
- **AND** filter tabs are **Published** and **Draft**

#### Scenario: Add story uses a modal

- **GIVEN** a brand user on `/app/success-stories`
- **WHEN** they click **+ Add Story**
- **THEN** an add-story dialog opens
- **AND** the page does not show a below-the-fold add form

### Requirement: Published stories appear on the marketing site

Published stories SHALL appear on the brand and franchise marketing site testimonials. Drafts SHALL NOT. Public quotes SHALL come only from published `brand_success_stories` — theme dummy quotes SHALL NOT render.

#### Scenario: Create published story

- **GIVEN** brand staff submit a title, quote, and author with Published on
- **WHEN** the insert succeeds
- **THEN** the row is stored on `brand_success_stories` with `is_published = true`

#### Scenario: Franchise homepage uses brand stories

- **GIVEN** a franchise public homepage
- **AND** the brand has published success stories
- **WHEN** the landing bundle is built
- **THEN** `#testimonials` shows those brand stories

#### Scenario: Hide testimonials when the brand has no published stories

- **GIVEN** a brand or franchise public homepage
- **AND** the brand has no published success stories
- **WHEN** the landing bundle is built
- **THEN** the testimonials section is omitted
- **AND** theme dummy quotes (for example Spark “John Matthews”) are not shown
- **AND** nav links to `#testimonials` are removed
