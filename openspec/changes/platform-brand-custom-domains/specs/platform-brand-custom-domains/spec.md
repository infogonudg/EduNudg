## ADDED Requirements

### Requirement: Platform admin maps purchased brand hostnames

Platform admins SHALL add, edit, and remove brand portal `domain_mappings` from `/admin/brands/:slug` **Domains** without using the SQL Editor. Writes SHALL go through platform-admin-only RPCs. Public visitors SHALL continue to resolve via `resolve_hostname_tenant`.

#### Scenario: Add custom brand domain

- **GIVEN** a platform admin is on `/admin/brands/:slug`
- **WHEN** they enter a hostname (e.g. `www.example.com`) and save as a brand domain
- **THEN** the system upserts `domain_mappings` with that hostname, the brand’s `brand_id`, `portal_type = brand`, and `center_id` null
- **AND** the Domains list shows the new hostname
- **AND** the UI shows that Vercel Domains + registrar DNS are still required

#### Scenario: Remove requires typed confirmation

- **GIVEN** a brand portal mapping exists for that brand
- **WHEN** the platform admin clicks **Remove**
- **THEN** a confirmation dialog opens and no delete RPC runs yet
- **WHEN** they type `CONFIRM` and confirm
- **THEN** that `domain_mappings` row is deleted
- **AND** center/learn mappings for the brand are not deleted by that action
- **AND** Vercel/DNS are not changed by the app

#### Scenario: Edit custom brand domain

- **GIVEN** a brand portal mapping exists for that brand
- **WHEN** the platform admin clicks **Edit**
- **THEN** the form prefills hostname and primary
- **WHEN** they change the hostname and save
- **THEN** the system upserts the new hostname and deletes the previous mapping row for that brand
- **AND** changing only primary updates the existing row via upsert

#### Scenario: Non-admin cannot write mappings

- **GIVEN** an authenticated user who is not a platform admin
- **WHEN** they call the upsert or delete domain mapping RPC
- **THEN** the call is rejected
