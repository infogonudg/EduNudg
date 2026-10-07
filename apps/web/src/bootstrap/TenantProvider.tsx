import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { TenantContext } from "@edunudg/tenant";
import { isPlatformHost, resolveTenantFromHost } from "@edunudg/tenant";
import { usesSameOriginPortals } from "@/lib/brandPortalUrl";
import { getSupabase } from "@/lib/supabase";
import { resolveTenantScope } from "@/lib/resolveTenantScope";
import {
  clearPortalOverride,
  isShortCenterPrettyLoginPath,
  parsePortalOverrideFromPath,
  parsePortalOverrideFromSearch,
  readStickyPortalOverride,
  shortCenterPrettyLoginLeaf,
  syntheticLookupHostname,
  writePortalOverride,
  type PortalOverride,
} from "@/lib/portalOverride";

const TenantCtx = createContext<TenantContext | null>(null);

function lookupHostnameForResolution(override: PortalOverride | null): string {
  const host = window.location.hostname;
  if (!override) return host;
  // Same-origin (Vercel + brand custom domains): honor ?portal=&center= / pretty paths via synthetic *.localhost.
  if (usesSameOriginPortals(host) || isPlatformHost(host)) {
    return syntheticLookupHostname(override);
  }
  return host;
}

/**
 * Sync overrides only (search + /b/... paths). Short /centers/... needs async host brand slug.
 */
function syncPortalOverride(pathname: string, search: string): PortalOverride | null {
  const hostname = window.location.hostname;
  if (pathname.startsWith("/admin") && isPlatformHost(hostname)) {
    clearPortalOverride();
    return null;
  }

  const fromUrl = parsePortalOverrideFromSearch(search);
  if (fromUrl) {
    writePortalOverride(fromUrl);
    return fromUrl;
  }

  const fromPath = parsePortalOverrideFromPath(pathname);
  if (fromPath) {
    writePortalOverride(fromPath);
    return fromPath;
  }

  if (isShortCenterPrettyLoginPath(pathname)) {
    return null;
  }

  return readStickyPortalOverride();
}

function portalResolutionKey(pathname: string, search: string): string {
  const override = syncPortalOverride(pathname, search);
  return [
    pathname,
    search,
    override?.portalType ?? "",
    override?.brandSlug ?? "",
    override?.centerSlug ?? "",
  ].join("\0");
}

function initialTenant(): TenantContext {
  return resolveTenantFromHost(
    lookupHostnameForResolution(syncPortalOverride(window.location.pathname, window.location.search))
  );
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [tenant, setTenant] = useState<TenantContext>(initialTenant);
  const [ready, setReady] = useState(false);
  const resolutionKey = portalResolutionKey(location.pathname, location.search);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 2000);

    let supabase: ReturnType<typeof getSupabase>;
    try {
      supabase = getSupabase();
    } catch {
      clearTimeout(timeout);
      if (!cancelled) {
        setTenant(
          resolveTenantFromHost(
            lookupHostnameForResolution(
              syncPortalOverride(location.pathname, location.search)
            )
          )
        );
        setReady(true);
      }
      return;
    }

    void (async () => {
      try {
        const fromSearch = parsePortalOverrideFromSearch(location.search);
        if (fromSearch) {
          writePortalOverride(fromSearch);
          const resolved = await resolveTenantScope(
            supabase,
            lookupHostnameForResolution(fromSearch)
          );
          if (!cancelled) setTenant(resolved);
          return;
        }

        const fromPath = parsePortalOverrideFromPath(location.pathname);
        if (fromPath) {
          writePortalOverride(fromPath);
          const resolved = await resolveTenantScope(
            supabase,
            lookupHostnameForResolution(fromPath)
          );
          if (!cancelled) setTenant(resolved);
          return;
        }

        const short = shortCenterPrettyLoginLeaf(location.pathname);
        if (short && (usesSameOriginPortals() || !isPlatformHost(window.location.hostname))) {
          const hostResolved = await resolveTenantScope(supabase, window.location.hostname);
          const brandSlug = hostResolved.brandSlug?.trim().toLowerCase() ?? "";
          const withBrand = parsePortalOverrideFromPath(location.pathname, brandSlug);
          if (withBrand) {
            writePortalOverride(withBrand);
            const resolved = await resolveTenantScope(
              supabase,
              lookupHostnameForResolution(withBrand)
            );
            if (!cancelled) setTenant(resolved);
            return;
          }
        }

        const sticky = readStickyPortalOverride();
        if (sticky && (usesSameOriginPortals() || isPlatformHost(window.location.hostname))) {
          const resolved = await resolveTenantScope(
            supabase,
            lookupHostnameForResolution(sticky)
          );
          if (!cancelled) setTenant(resolved);
          return;
        }

        const resolved = await resolveTenantScope(supabase, window.location.hostname);
        if (!cancelled) setTenant(resolved);
      } catch {
        if (!cancelled) {
          setTenant(
            resolveTenantFromHost(
              lookupHostnameForResolution(
                syncPortalOverride(location.pathname, location.search)
              )
            )
          );
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [resolutionKey, location.pathname, location.search]);

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        Loading EduNudg…
      </div>
    );
  }

  return <TenantCtx.Provider value={tenant}>{children}</TenantCtx.Provider>;
}

export function useTenant(): TenantContext {
  const ctx = useContext(TenantCtx);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
