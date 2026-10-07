import { centerPortalUrl, portalLoginUrl } from "@/lib/brandPortalUrl";

/**
 * Student/parent learn portal sign-in for a brand.
 * Local: `http://learn.{brand}.localhost:9000/login` (`?center=` when the franchise is known)
 * Same-origin: pretty `/centers/{center}/student-login` (or `/b/{brand}/…` on Vercel).
 * Without center slug, falls back to `/login?portal=learn&brand=…`.
 */
export function learnPortalLoginUrl(brandSlug: string, centerSlug?: string | null): string {
  return portalLoginUrl({ portalType: "learn", brandSlug, centerSlug });
}

/**
 * Center slug from a seed/RPC hostname (`{center}.{brand}.localhost` or prod equivalent).
 */
export function centerSlugFromPortalHostname(hostname: string): string | null {
  const host = hostname.trim().toLowerCase().split(":")[0];
  if (!host) return null;

  if (host.endsWith(".localhost")) {
    const without = host.slice(0, -".localhost".length);
    const segs = without.split(".").filter(Boolean);
    return segs[0] ?? null;
  }

  const segs = host.split(".").filter(Boolean);
  // center.brand.example.com
  if (segs.length >= 3) return segs[0] ?? null;
  return null;
}

/**
 * Rewrite learn-home/profile RPC `center.public_url` (`http://{center}.{brand}.localhost:9000/`)
 * for the current host. On Vercel same-origin this becomes `/?portal=center&brand=…&center=…`.
 */
export function resolveCenterWebsiteUrl(brandSlug: string, publicUrlFromRpc: string): string {
  const raw = publicUrlFromRpc.trim();
  const brand = brandSlug.trim();
  if (!raw || !brand) return raw;

  let hostname = "";
  try {
    hostname = new URL(raw).hostname;
  } catch {
    return raw;
  }

  const centerSlug = centerSlugFromPortalHostname(hostname);
  if (!centerSlug) return raw;

  return centerPortalUrl(brand, centerSlug, hostname);
}

export const CENTER_STAFF_LOGIN_PATH = "/login";
