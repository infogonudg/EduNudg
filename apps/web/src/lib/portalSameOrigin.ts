/**
 * Same-origin portal detection without `window` / `@/` aliases.
 * Safe for Vercel Node SEO functions (`/api/public-seo`, `/api/seo-document`).
 */

export function isLocalDevHostname(hostname: string): boolean {
  const host = hostname.split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

export function readPortalBaseDomainFromEnv(): string {
  const env = typeof process !== "undefined" ? process.env : {};
  let fromVite = "";
  try {
    fromVite = String(
      (import.meta as ImportMeta & { env?: Record<string, unknown> }).env?.VITE_PORTAL_BASE_DOMAIN ?? ""
    ).trim();
  } catch {
    /* Node / Vercel without Vite import.meta.env */
  }
  return (fromVite || String(env.VITE_PORTAL_BASE_DOMAIN ?? "").trim())
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

/** True when public links must stay on this host (no `{brand}.{base}` subdomains). */
export function usesSameOriginPortalsHost(hostname: string, portalBaseDomain?: string): boolean {
  if (isLocalDevHostname(hostname)) return false;
  const base = (portalBaseDomain ?? readPortalBaseDomainFromEnv()).trim();
  return !base;
}
