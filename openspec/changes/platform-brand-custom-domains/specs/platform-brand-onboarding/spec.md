## MODIFIED Requirements

### Requirement: Brand detail Domains

On `/admin/brands/:slug`, **Domains** SHALL list `domain_mappings` for the brand (paginated after 10 rows) and SHALL allow platform admins to add and remove **brand** portal custom hostnames via RPCs. Franchise center/learn rows remain listed when present; this screen SHALL NOT offer remove for non-brand portal rows.

#### Scenario: Domains card supports add brand hostname

- **GIVEN** a platform admin views brand detail Domains
- **WHEN** they add a purchased hostname as portal type brand
- **THEN** the mapping is persisted and listed without requiring SQL
