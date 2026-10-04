## 1. Database

- [x] 1.1 Migration `109_upsert_brand_domain_mapping.sql` — upsert + delete RPCs (platform admin only)
- [x] 1.2 RLS test `rls_upsert_brand_domain_mapping.sql`
- [x] 1.3 Update table dictionary / rpc catalog

## 2. Frontend

- [x] 2.1 Client helpers for upsert/delete + hostname normalize
- [x] 2.2 Brand detail Domains add/remove UI + ops checklist
- [x] 2.3 Vitest regressions for add/remove and normalize
- [x] 2.4 Remove requires ConfirmDeleteDialog (`CONFIRM`); Edit prefills form / rename via upsert+delete old

## 3. Docs / sync

- [x] 3.1 Runbook: map domain from UI then Vercel/DNS
- [x] 3.2 Sync main OpenSpec `platform-brand-onboarding` + new capability
