import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, DataList, DirectoryPagination, ListRow, PageToolbar } from "@edunudg/ui";
import {
  brandDetailPaginationSummary,
  paginateBrandDetailList,
  shouldPaginateBrandDetailList,
} from "@/lib/brandDetailLists";
import { getSupabase } from "@/lib/supabase";
import { brandAdminPath, isUuid } from "@/lib/adminPaths";
import { brandPortalHostname, portalOriginUrl, portalTargetFromDomain } from "@/lib/brandPortalUrl";
import { resolvedBrandSiteLogoUrl } from "@/lib/brandLandingEditorApi";
import { supabaseList, supabaseMaybe } from "@/lib/supabaseResult";
import { useBrandMonitoringStats } from "@/hooks/useBrandMonitoringStats";
import { BrandEditForm } from "./BrandEditForm";
import { BrandDomainsCard } from "./BrandDomainsCard";
import { BrandFeatureTogglesCard } from "./BrandFeatureTogglesCard";
import { BrandPerformanceCard } from "./BrandPerformanceCard";
import { PortalOpenButton } from "./PortalOpenButton";
import { FranchiseCenterImportDialog } from "./FranchiseCenterImportDialog";
import "./brandDetailPage.css";

interface BrandRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  logo_url: string | null;
  marketing_theme: string;
  created_at: string;
  updated_at: string;
}

interface CenterRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  city: string | null;
}

interface DomainRow {
  hostname: string;
  portal_type: string;
  is_primary: boolean;
}

export function BrandDetailPage() {
  const { brandSlug: brandSlugParam } = useParams<{ brandSlug: string }>();
  const brandSlug = brandSlugParam?.trim() ?? "";
  const lookupById = isUuid(brandSlug);
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [centersPage, setCentersPage] = useState(1);
  const [domainsPage, setDomainsPage] = useState(1);

  const brand = useQuery({
    queryKey: ["brand", lookupById ? "id" : "slug", brandSlug],
    enabled: !!brandSlug,
    queryFn: async () => {
      const q = getSupabase()
        .from("brands")
        .select("id, slug, name, status, logo_url, marketing_theme, created_at, updated_at")
        .is("deleted_at", null);
      const { data, error } = lookupById
        ? await q.eq("id", brandSlug).maybeSingle()
        : await q.eq("slug", brandSlug).maybeSingle();
      return supabaseMaybe(data, error) as BrandRow | null;
    },
  });

  const brandId = brand.data?.id;
  const monitoring = useBrandMonitoringStats(brandId);

  const centers = useQuery({
    queryKey: ["brand-centers", brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("franchise_centers")
        .select("id, slug, name, status, city")
        .eq("brand_id", brandId!)
        .is("deleted_at", null)
        .order("name");
      return supabaseList(data, error) as CenterRow[];
    },
  });

  const domains = useQuery({
    queryKey: ["brand-domains", brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("domain_mappings")
        .select("hostname, portal_type, is_primary")
        .eq("brand_id", brandId!)
        .order("is_primary", { ascending: false });
      return supabaseList(data, error) as DomainRow[];
    },
  });

  const subscription = useQuery({
    queryKey: ["brand-subscription", brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("brand_subscriptions")
        .select("status, subscription_plans(name, code)")
        .eq("brand_id", brandId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return supabaseMaybe(data, error);
    },
  });

  const brandSettings = useQuery({
    queryKey: ["brand-settings", brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("brand_settings")
        .select("id, settings")
        .eq("brand_id", brandId!)
        .maybeSingle();
      return supabaseMaybe(data, error) as { id: string; settings: Record<string, unknown> } | null;
    },
  });

  const centersList = useMemo(
    () => paginateBrandDetailList(centers.data ?? [], centersPage),
    [centers.data, centersPage]
  );

  useEffect(() => {
    setCentersPage(1);
    setDomainsPage(1);
  }, [brandId]);

  useEffect(() => {
    if (brand.data?.name) {
      document.title = `${brand.data.name} · Brands · EduNudg Admin`;
    }
    return () => {
      document.title = "EduNudg";
    };
  }, [brand.data?.name]);

  if (brand.isLoading || (brand.isFetching && !brand.data)) return <p className="ed-empty">Loading brand…</p>;

  if (brand.data && lookupById && brand.data.slug !== brandSlug) {
    return <Navigate to={brandAdminPath(brand.data.slug)} replace />;
  }

  // After a rename, keep showing the previous brand while navigating to the new slug URL.
  if (!brand.data) {
    if (brand.isFetching) return <p className="ed-empty">Loading brand…</p>;
    return (
      <>
        <PageToolbar title="Brand not found">
          <Link to="/admin/brands">
            <Button variant="ghost">Back to brands</Button>
          </Link>
        </PageToolbar>
        <p className="ed-empty">This brand does not exist or you do not have access.</p>
      </>
    );
  }

  const b = brand.data;
  const stats = monitoring.data;
  const siteLogoUrl = resolvedBrandSiteLogoUrl(brandSettings.data?.settings, b.logo_url);
  const primaryBrandHost =
    domains.data?.find((d) => d.portal_type === "brand" && d.is_primary)?.hostname ??
    domains.data?.find((d) => d.portal_type === "brand")?.hostname;
  const brandBackendTarget = portalTargetFromDomain(
    "brand",
    primaryBrandHost ?? brandPortalHostname(b.slug),
    b.slug
  );

  const sub = subscription.data as
    | { status: string; subscription_plans?: { name: string; code: string } | null }
    | null
    | undefined;

  return (
    <>
      <PageToolbar
        title={
          <h2 className="ed-page-title ed-page-title--with-sub ed-brand-detail__title">
            {siteLogoUrl ? <img src={siteLogoUrl} alt="" className="ed-brand-detail__logo" /> : null}
            <span>{b.name}</span>
          </h2>
        }
        subtitle={
          <>
            <span className="ed-muted">{b.slug}</span> ·{" "}
            <Badge tone={b.status === "active" ? "success" : b.status === "suspended" ? "warning" : "default"}>
              {b.status}
            </Badge>
          </>
        }
      >
        <Link to="/admin/brands">
          <Button variant="ghost">All brands</Button>
        </Link>
        {brandBackendTarget ? (
          <a
            href={portalOriginUrl(brandBackendTarget)}
            className="ed-btn ed-btn--ghost"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Frontend ↗
          </a>
        ) : null}
        {brandBackendTarget ? <PortalOpenButton target={brandBackendTarget} label="Open brand backend" /> : null}
      </PageToolbar>

      <BrandPerformanceCard
        loading={monitoring.isLoading}
        stats={stats}
        subscription={sub ?? null}
      />

      <Card title="Brand settings">
        <BrandEditForm
          brandId={b.id}
          slug={b.slug}
          name={b.name}
          status={b.status as "draft" | "active" | "suspended" | "archived"}
          logoUrl={siteLogoUrl}
          marketingTheme={b.marketing_theme}
        />
      </Card>

      {brandId && !brandSettings.isLoading && (
        <BrandFeatureTogglesCard
          brandId={brandId}
          settingsId={brandSettings.data?.id ?? null}
          settings={brandSettings.data?.settings ?? {}}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ["brand-settings", brandId] });
            void qc.invalidateQueries({ queryKey: ["brand-features", brandId] });
          }}
        />
      )}

      <BrandDomainsCard
        brandId={b.id}
        brandSlug={b.slug}
        domains={domains.data ?? []}
        domainsPage={domainsPage}
        onDomainsPageChange={setDomainsPage}
      />

      <Card
        title="Franchise centers"
        actions={
          <div className="ed-brand-detail__center-actions">
            <Button type="button" variant="secondary" onClick={() => setImportOpen(true)}>
              Import Franchise
            </Button>
          </div>
        }
      >
        <DataList
          items={centersList.items}
          empty="No centers yet. Import a CSV to onboard franchise locations."
          render={(c) => {
            const centerHost =
              domains.data?.find(
                (d) => d.portal_type === "center" && d.hostname.toLowerCase().startsWith(`${c.slug}.`)
              )?.hostname ?? `${c.slug}.${brandPortalHostname(b.slug)}`;
            const target = portalTargetFromDomain("center", centerHost, b.slug);
            return (
              <ListRow aside={target ? <PortalOpenButton target={target} label="Open center" /> : undefined}>
                <div>
                  <strong>{c.name}</strong>
                  <div className="ed-text-sm ed-muted">
                    {c.slug}
                    {c.city ? ` · ${c.city}` : ""}
                  </div>
                  <Badge tone={c.status === "active" ? "success" : "default"}>{c.status}</Badge>
                </div>
              </ListRow>
            );
          }}
        />
        {shouldPaginateBrandDetailList(centersList.total) ? (
          <DirectoryPagination
            aria-label="Franchise centers pagination"
            summary={brandDetailPaginationSummary(centersList, "No centers")}
            onPrevious={() => setCentersPage((current) => Math.max(1, current - 1))}
            onNext={() => setCentersPage((current) => Math.min(centersList.pageCount, current + 1))}
            disablePrevious={centersList.page <= 1}
            disableNext={centersList.page >= centersList.pageCount}
          />
        ) : null}
      </Card>

      <FranchiseCenterImportDialog
        brandId={b.id}
        brandSlug={b.slug}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          void qc.invalidateQueries({ queryKey: ["brand-centers", brandId] });
          void qc.invalidateQueries({ queryKey: ["brand-domains", brandId] });
        }}
      />
    </>
  );
}
