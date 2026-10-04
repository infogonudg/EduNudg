import type { PortalType } from "@edunudg/tenant";

export type PortalOverride = {
  portalType: Exclude<PortalType, "platform">;
  brandSlug: string;
  centerSlug?: string | null;
};

const STORAGE_KEY = "edunudg.portalOverride";

const PORTAL_TYPES = new Set(["brand", "center", "learn", "parents"]);

/** Safe slug for path segments (no injection / path traversal). */
export function isPortalPathSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** Synthetic host matching seed/RPC domain_mappings (always *.localhost in DB today). */
export function syntheticLookupHostname(override: PortalOverride): string {
  const brand = override.brandSlug.toLowerCase();
  if (override.portalType === "center") {
    const center = (override.centerSlug ?? "").toLowerCase();
    return `${center}.${brand}.localhost`;
  }
  if (override.portalType === "learn") return `learn.${brand}.localhost`;
  if (override.portalType === "parents") return `parents.${brand}.localhost`;
  return `${brand}.localhost`;
}

export function parsePortalOverrideFromSearch(search: string): PortalOverride | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const portalType = params.get("portal")?.trim().toLowerCase() ?? "";
  const brandSlug = params.get("brand")?.trim().toLowerCase() ?? "";
  if (!PORTAL_TYPES.has(portalType) || !brandSlug) return null;
  if (!isPortalPathSlug(brandSlug)) return null;

  const centerSlug = params.get("center")?.trim().toLowerCase() || null;
  if (portalType === "center" && !centerSlug) return null;
  if (centerSlug && !isPortalPathSlug(centerSlug)) return null;

  return {
    portalType: portalType as PortalOverride["portalType"],
    brandSlug,
    centerSlug,
  };
}

/**
 * Pretty login paths (no ?portal=):
 * - /b/:brand/centers/:center/login → center staff
 * - /b/:brand/centers/:center/student-login → student
 * - /b/:brand/login → brand staff (Vercel)
 * - /centers/:center/login → center staff (brand from host mapping)
 * - /centers/:center/student-login → student (brand from host mapping)
 */
export function parsePortalOverrideFromPath(
  pathname: string,
  brandSlugHint?: string | null
): PortalOverride | null {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "";
  const segments = path.split("/").filter(Boolean);

  if (segments[0] === "b" && segments.length >= 2) {
    const brandSlug = (segments[1] ?? "").toLowerCase();
    if (!isPortalPathSlug(brandSlug)) return null;

    if (segments[2] === "centers" && segments.length >= 5) {
      const centerSlug = (segments[3] ?? "").toLowerCase();
      const leaf = segments[4] ?? "";
      if (!isPortalPathSlug(centerSlug)) return null;
      if (leaf === "login") {
        return { portalType: "center", brandSlug, centerSlug };
      }
      if (leaf === "student-login") {
        return { portalType: "learn", brandSlug, centerSlug };
      }
      return null;
    }

    if (segments.length === 3 && segments[2] === "login") {
      return { portalType: "brand", brandSlug, centerSlug: null };
    }
    return null;
  }

  if (segments[0] === "centers" && segments.length === 3) {
    const brandSlug = (brandSlugHint ?? "").trim().toLowerCase();
    const centerSlug = (segments[1] ?? "").toLowerCase();
    const leaf = segments[2] ?? "";
    if (!isPortalPathSlug(brandSlug) || !isPortalPathSlug(centerSlug)) return null;
    if (leaf === "login") {
      return { portalType: "center", brandSlug, centerSlug };
    }
    if (leaf === "student-login") {
      return { portalType: "learn", brandSlug, centerSlug };
    }
  }

  return null;
}

/** True when path is /centers/:slug/(login|student-login) and needs brand from hostname RPC. */
export function isShortCenterPrettyLoginPath(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "";
  const segments = path.split("/").filter(Boolean);
  if (segments[0] !== "centers" || segments.length !== 3) return false;
  const centerSlug = segments[1] ?? "";
  const leaf = segments[2] ?? "";
  return isPortalPathSlug(centerSlug) && (leaf === "login" || leaf === "student-login");
}

export function shortCenterPrettyLoginLeaf(
  pathname: string
): { centerSlug: string; portalType: "center" | "learn" } | null {
  if (!isShortCenterPrettyLoginPath(pathname)) return null;
  const segments = pathname.split("/").filter(Boolean);
  const centerSlug = (segments[1] ?? "").toLowerCase();
  const leaf = segments[2] ?? "";
  return {
    centerSlug,
    portalType: leaf === "student-login" ? "learn" : "center",
  };
}

export function readPortalOverride(): PortalOverride | null {
  if (typeof window === "undefined") return null;

  const fromUrl = parsePortalOverrideFromSearch(window.location.search);
  if (fromUrl) {
    writePortalOverride(fromUrl);
    return fromUrl;
  }

  const fromPath = parsePortalOverrideFromPath(window.location.pathname);
  if (fromPath) {
    writePortalOverride(fromPath);
    return fromPath;
  }

  return readStickyPortalOverride();
}

/** Session sticky only — used when React Router search has no portal params. */
export function readStickyPortalOverride(): PortalOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalOverride;
    if (!PORTAL_TYPES.has(parsed.portalType) || !parsed.brandSlug?.trim()) return null;
    if (parsed.portalType === "center" && !parsed.centerSlug?.trim()) return null;
    return {
      portalType: parsed.portalType,
      brandSlug: parsed.brandSlug.trim().toLowerCase(),
      centerSlug: parsed.centerSlug?.trim().toLowerCase() || null,
    };
  } catch {
    return null;
  }
}

export function writePortalOverride(override: PortalOverride): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      portalType: override.portalType,
      brandSlug: override.brandSlug.trim().toLowerCase(),
      centerSlug: override.centerSlug?.trim().toLowerCase() || null,
    })
  );
}

export function clearPortalOverride(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Append portal override query params (for same-origin portal URLs). */
export function portalOverrideSearchParams(override: PortalOverride): URLSearchParams {
  const params = new URLSearchParams();
  params.set("portal", override.portalType);
  params.set("brand", override.brandSlug);
  if (override.centerSlug) {
    params.set("center", override.centerSlug);
  }
  return params;
}
