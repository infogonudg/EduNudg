/**
 * Builds portal origins for brand, center, learn, and parents hosts.
 * Dev: http://{slug}.localhost:9000/
 * Prod custom domain: https://{slug}.{VITE_PORTAL_BASE_DOMAIN}/
 * Single-host (e.g. *.vercel.app without base domain): same-origin + ?portal=&brand=
 */

import {
  portalOverrideSearchParams,
  type PortalOverride,
} from "@/lib/portalOverride";

export type PortalType = "brand" | "center" | "learn" | "parents";

export type PortalTarget = {
  portalType: PortalType;
  brandSlug: string;
  centerSlug?: string | null;
  hostname?: string | null;
};

function currentHostname(): string {
  return window.location.hostname.toLowerCase();
}

function portSuffix(): string {
  const { port } = window.location;
  return port && port !== "80" && port !== "443" ? `:${port}` : "";
}

export function isLocalDevHost(hostname = currentHostname()): boolean {
  const host = hostname.split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

/** Apex domain for real multi-host portals (e.g. edunudg.com). Empty → same-origin mode. */
export function getPortalBaseDomain(hostname = currentHostname()): string {
  const fromEnv = import.meta.env.VITE_PORTAL_BASE_DOMAIN?.trim().toLowerCase() ?? "";
  if (fromEnv) return fromEnv.replace(/^\.+|\.+$/g, "");

  const host = hostname.split(":")[0].toLowerCase();
  if (isLocalDevHost(host)) return "localhost";

  const parts = host.split(".");
  if (parts[0] === "admin" && parts.length > 2) {
    return parts.slice(1).join(".");
  }

  return "";
}

/**
 * When true, brand/center/learn portals share the current origin and use ?portal=&brand= overrides.
 * Used on Vercel *.vercel.app and brand custom domains (e.g. smartbraineducations.com) until
 * VITE_PORTAL_BASE_DOMAIN enables real multi-host subdomains.
 */
export function usesSameOriginPortals(hostname = currentHostname()): boolean {
  if (isLocalDevHost(hostname)) return false;
  // No wildcard portal base → keep links on this host (never emit *.localhost on Production).
  return !getPortalBaseDomain(hostname);
}

/** Rewrite seed/RPC `*.localhost` hosts to the current environment's portal base domain. */
export function normalizePortalHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase().split(":")[0];
  if (!host) return host;

  if (isLocalDevHost()) return host;

  const base = getPortalBaseDomain();
  if (!base) return host;

  if (host === "localhost" || host === "127.0.0.1") return base;
  if (host.endsWith(".localhost")) {
    return `${host.slice(0, -".localhost".length)}.${base}`;
  }
  return host;
}

export function brandPortalHostname(slug: string, preferredHostname?: string | null): string {
  if (preferredHostname?.trim()) {
    return normalizePortalHostname(preferredHostname);
  }

  const host = currentHostname();
  if (isLocalDevHost(host)) {
    return `${slug}.localhost`;
  }

  const base = getPortalBaseDomain();
  if (base) {
    return `${slug}.${base}`;
  }

  // Same-origin mode: keep synthetic DB hostname for callers that need a label;
  // portalOriginUrl will not navigate here.
  return `${slug}.localhost`;
}

function targetToOverride(target: PortalTarget): PortalOverride {
  return {
    portalType: target.portalType,
    brandSlug: target.brandSlug,
    centerSlug: target.centerSlug,
  };
}

function sameOriginUrl(path: string, target: PortalTarget, extra?: Record<string, string>): string {
  const origin = window.location.origin;
  const params = portalOverrideSearchParams(targetToOverride(target));
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
  }
  const qs = params.toString();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}${qs ? `?${qs}` : ""}`;
}

export function brandPortalUrl(slug: string, preferredHostname?: string | null): string {
  if (usesSameOriginPortals()) {
    return sameOriginUrl("/", { portalType: "brand", brandSlug: slug, hostname: preferredHostname });
  }
  const { protocol } = window.location;
  const hostname = brandPortalHostname(slug, preferredHostname);
  return `${protocol}//${hostname}${portSuffix()}/`;
}

/** Center marketing site on {center}.{brand}.localhost (or prod equivalent). */
export function centerPortalUrl(
  brandSlug: string,
  centerSlug: string,
  preferredHostname?: string | null
): string {
  if (usesSameOriginPortals()) {
    return sameOriginUrl("/", {
      portalType: "center",
      brandSlug,
      centerSlug,
      hostname: preferredHostname,
    });
  }
  const { protocol } = window.location;
  if (preferredHostname?.trim()) {
    const host = normalizePortalHostname(preferredHostname);
    return `${protocol}//${host}${portSuffix()}/`;
  }
  const brandHost = brandPortalHostname(brandSlug);
  return `${protocol}//${centerSlug}.${brandHost}${portSuffix()}/`;
}

export function learnPortalUrl(brandSlug: string, preferredHostname?: string | null): string {
  if (usesSameOriginPortals()) {
    return sameOriginUrl("/", { portalType: "learn", brandSlug, hostname: preferredHostname });
  }
  const { protocol } = window.location;
  if (preferredHostname?.trim()) {
    const host = normalizePortalHostname(preferredHostname);
    return `${protocol}//${host}${portSuffix()}/`;
  }
  const brandHost = brandPortalHostname(brandSlug);
  return `${protocol}//learn.${brandHost}${portSuffix()}/`;
}

export function parentsPortalUrl(brandSlug: string, preferredHostname?: string | null): string {
  if (usesSameOriginPortals()) {
    return sameOriginUrl("/", { portalType: "parents", brandSlug, hostname: preferredHostname });
  }
  const { protocol } = window.location;
  if (preferredHostname?.trim()) {
    const host = normalizePortalHostname(preferredHostname);
    return `${protocol}//${host}${portSuffix()}/`;
  }
  const brandHost = brandPortalHostname(brandSlug);
  return `${protocol}//parents.${brandHost}${portSuffix()}/`;
}

export function portalOriginUrl(target: PortalTarget): string {
  switch (target.portalType) {
    case "center":
      return centerPortalUrl(target.brandSlug, target.centerSlug ?? "", target.hostname);
    case "learn":
      return learnPortalUrl(target.brandSlug, target.hostname);
    case "parents":
      return parentsPortalUrl(target.brandSlug, target.hostname);
    default:
      return brandPortalUrl(target.brandSlug, target.hostname);
  }
}

/** Staff backend path after sign-in (brand/center → /app; learn/parents → /). */
export function portalBackendPath(target: PortalTarget): string {
  if (target.portalType === "learn" || target.portalType === "parents") return "/";
  return "/app";
}

export function portalBackendUrl(target: PortalTarget): string {
  if (usesSameOriginPortals()) {
    return sameOriginUrl(portalBackendPath(target), target);
  }
  const origin = portalOriginUrl(target).replace(/\/$/, "");
  const path = portalBackendPath(target);
  return `${origin}${path}`;
}

/** Staff login URL for a portal (brand/center → /login; same-origin adds ?portal=&brand=). */
export function portalLoginUrl(target: PortalTarget): string {
  if (usesSameOriginPortals()) {
    return sameOriginUrl("/login", target);
  }
  const origin = portalOriginUrl(target).replace(/\/$/, "");
  const login = `${origin}/login`;
  const center = target.centerSlug?.trim().toLowerCase() ?? "";
  if ((target.portalType === "learn" || target.portalType === "parents") && center) {
    return `${login}?center=${encodeURIComponent(center)}`;
  }
  return login;
}

/** Callback URL on the target portal host; edge function appends token_hash for verifyOtp handoff. */
export function portalHandoffLoginUrl(target: PortalTarget): string {
  if (usesSameOriginPortals()) {
    return sameOriginUrl("/auth/handoff", target, { next: portalBackendPath(target) });
  }
  const origin = portalOriginUrl(target).replace(/\/$/, "");
  const next = portalBackendPath(target);
  return `${origin}/auth/handoff?next=${encodeURIComponent(next)}`;
}

export function portalTargetFromDomain(
  portalType: string,
  hostname: string,
  brandSlug: string
): PortalTarget | null {
  const type = portalType as PortalType;
  if (!["brand", "center", "learn", "parents"].includes(type)) return null;

  const normalizedHost = normalizePortalHostname(hostname);

  if (type === "center") {
    const centerSlug = hostname.split(".")[0] ?? "";
    if (!centerSlug) return null;
    return { portalType: "center", brandSlug, centerSlug, hostname: normalizedHost };
  }

  return { portalType: type, brandSlug, hostname: normalizedHost };
}

/** Build a portal target from brand slug without assuming .localhost. */
export function brandPortalTarget(brandSlug: string, preferredHostname?: string | null): PortalTarget {
  return {
    portalType: "brand",
    brandSlug,
    hostname: preferredHostname?.trim()
      ? normalizePortalHostname(preferredHostname)
      : brandPortalHostname(brandSlug),
  };
}
