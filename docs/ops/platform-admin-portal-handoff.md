# Platform admin cross-portal handoff

Platform admins (`platform_super_admin`) can open any brand, center, learn, or parents portal **signed in as themselves** for customer support. This uses a one-time token and client-side `verifyOtp` — **not** Supabase `action_link` redirects (which fall back to Site URL when subdomains are not allowlisted).

## Where to use it

| UI | Location | Lands on |
|----|----------|----------|
| **Brand backend** | Platform → Brands (list or brand detail toolbar) | `{brand-host}/app` (local) or same-origin `/app?portal=brand&brand=…` on `*.vercel.app` |
| **Open** | Brand detail → Domains (brand / center / learn / parents rows) | Staff backend or portal home per type |
| **Open center** | Brand detail → Franchise centers | `{center-host}/app` or same-origin `/app?portal=center&brand=…&center=…` |

## Flow

1. Signed-in platform admin clicks **Brand backend** or **Open**.
2. SPA calls Edge Function `platform-portal-handoff` with `redirectTo` = `{origin}/auth/handoff?next={path}`.
3. Edge Function validates `is_platform_admin()`, generates `hashed_token` via `auth.admin.generateLink`.
4. Browser opens `{origin}/auth/handoff?token_hash=…&next=…` on the **target host** (e.g. `smart-brain-abacus.localhost:9000`).
5. On single-host deploys (`*.vercel.app` or a brand custom domain without `VITE_PORTAL_BASE_DOMAIN`), step 2 uses the **current origin** plus `portal` / `brand` / `center` query params instead of `*.localhost`.
6. `AuthHandoffPage` runs `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`, persists the portal override, and navigates to `next` (`/app` for brand/center, `/` for learn/parents).

## Code map

| Piece | Path |
|-------|------|
| Open buttons | `apps/web/src/features/platform/PortalOpenButton.tsx` |
| Handoff client | `apps/web/src/lib/portalHandoffApi.ts`, `portalHandoffUrl.ts`, `brandPortalUrl.ts` |
| Handoff page | `apps/web/src/features/auth/AuthHandoffPage.tsx` — route `/auth/handoff` on all portal hosts |
| Edge Function | `supabase/functions/platform-portal-handoff/index.ts` |
| Membership | `hasPortalMembership()` — platform scope grants access on brand/center hosts |

## Deploy

```bash
pnpm dlx supabase functions deploy platform-portal-handoff
```

Redeploy after this change so same-origin `portal` / `brand` / `center` query params survive token append on Vercel.
## Auth dashboard

| Setting | Value (local) |
|---------|----------------|
| Site URL | `http://localhost:9000` — **not** `localhost:3000` |
| Redirect URLs | `http://localhost:9000/**` |

Also allow production: `https://edunudg-hub.vercel.app/**` (and any custom portal domains).

Handoff does **not** require every `*.localhost:9000` subdomain in redirect allowlists.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Redirect to `localhost:3000` / connection refused | Redeploy `platform-portal-handoff`; ensure app uses `/auth/handoff` (not raw `action_link`). Set Site URL to port **9000**. |
| Handoff page: “incomplete link” | Re-click **Open** from Brands while signed in as platform admin. |
| Lands on login, not `/app` | Confirm `platform-portal-handoff` deployed; check browser network for function errors. |
| Lands on **platform homepage** on `*.vercel.app` | Same-origin mode needs `?portal=&brand=` on the handoff URL. Client now re-appends those params if missing and full-reloads after verify. Redeploy the web app; optionally redeploy `platform-portal-handoff`. |
| Access denied after handoff | User must have active `memberships` row with `scope_type = 'platform'`. |

## Tests (critical)

```bash
pnpm --filter web test -- platformAdminPortalAccess.critical portalHandoffUrl AuthHandoffPage backendKpiTheme
```

See `apps/web/src/lib/platformAdminPortalAccess.critical.test.tsx`.

## Related

- [test-users.md](./test-users.md)
- [supabase-cloud-setup.md](./supabase-cloud-setup.md)
- [edge-functions.md](./edge-functions.md)
- [auth-providers.md](../architecture/auth-providers.md)
