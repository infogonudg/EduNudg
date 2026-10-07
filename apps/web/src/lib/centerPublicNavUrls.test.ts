import { describe, expect, it, vi, afterEach } from "vitest";
import {
  centerSlugFromPortalHostname,
  learnPortalLoginUrl,
  resolveCenterWebsiteUrl,
} from "./centerPublicNavUrls";

describe("learnPortalLoginUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds learn portal login URL for brand slug", () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "http:",
        hostname: "koramangala.abacusworld.localhost",
        port: "9000",
        origin: "http://koramangala.abacusworld.localhost:9000",
      },
    });
    expect(learnPortalLoginUrl("abacusworld")).toBe(
      "http://learn.abacusworld.localhost:9000/login"
    );
  });

  it("appends franchise center so learn /login can load public chrome", () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "http:",
        hostname: "koramangala.abacusworld.localhost",
        port: "9000",
        origin: "http://koramangala.abacusworld.localhost:9000",
      },
    });
    expect(learnPortalLoginUrl("abacusworld", "koramangala")).toBe(
      "http://learn.abacusworld.localhost:9000/login?center=koramangala"
    );
  });

  it("regression_vercel_student_login_uses_path_before_portal_query", () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "edunudg-hub.vercel.app",
        port: "",
        origin: "https://edunudg-hub.vercel.app",
      },
    });
    const url = learnPortalLoginUrl("smart-brain-abacus");
    expect(url).toBe(
      "https://edunudg-hub.vercel.app/login?portal=learn&brand=smart-brain-abacus"
    );
    expect(learnPortalLoginUrl("smart-brain-abacus", "smart-brain-abacus")).toBe(
      "https://edunudg-hub.vercel.app/b/smart-brain-abacus/centers/smart-brain-abacus/student-login"
    );
    expect(url).not.toMatch(/brand=[^&]*\/login/);
  });

  it("regression_custom_domain_student_login_uses_pretty_path", () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "dev.smartbraineducations.com",
        port: "",
        origin: "https://dev.smartbraineducations.com",
      },
    });
    expect(learnPortalLoginUrl("smart-brain-abacus", "kalyani-gebad")).toBe(
      "https://dev.smartbraineducations.com/centers/kalyani-gebad/student-login"
    );
  });
});

describe("resolveCenterWebsiteUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps localhost RPC public_url on local center hosts", () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "http:",
        hostname: "learn.abacusworld.localhost",
        port: "9000",
        origin: "http://learn.abacusworld.localhost:9000",
      },
    });
    expect(
      resolveCenterWebsiteUrl("abacusworld", "http://koramangala.abacusworld.localhost:9000/")
    ).toBe("http://koramangala.abacusworld.localhost:9000/");
  });

  it("regression_vercel_center_website_rewrites_localhost_rpc_url", () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "edunudg-hub.vercel.app",
        port: "",
        origin: "https://edunudg-hub.vercel.app",
      },
    });
    const url = resolveCenterWebsiteUrl(
      "smart-brain-abacus",
      "http://smart-brain-abacus.smart-brain-abacus.localhost:9000/"
    );
    expect(url).toBe(
      "https://edunudg-hub.vercel.app/?portal=center&brand=smart-brain-abacus&center=smart-brain-abacus"
    );
    expect(url).not.toMatch(/localhost|:9000/);
  });

  it("parses center slug from seed hostname", () => {
    expect(centerSlugFromPortalHostname("koramangala.abacusworld.localhost")).toBe("koramangala");
    expect(
      centerSlugFromPortalHostname("smart-brain-abacus.smart-brain-abacus.localhost")
    ).toBe("smart-brain-abacus");
  });
});
