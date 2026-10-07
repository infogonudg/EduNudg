import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CenterPublicNavLogins } from "./CenterPublicNavLogins";

describe("CenterPublicNavLogins", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        protocol: "http:",
        hostname: "koramangala.abacusworld.localhost",
        port: "9000",
        origin: "http://koramangala.abacusworld.localhost:9000",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows only Student Login linking to learn portal", () => {
    render(
      <MemoryRouter>
        <CenterPublicNavLogins brandSlug="abacusworld" centerSlug="koramangala" />
      </MemoryRouter>
    );

    const link = screen.getByRole("link", { name: "Student Login" });
    expect(link.getAttribute("href")).toBe(
      "http://learn.abacusworld.localhost:9000/login?center=koramangala"
    );
    expect(screen.queryByRole("link", { name: /staff login/i })).toBeNull();
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
    render(
      <MemoryRouter>
        <CenterPublicNavLogins brandSlug="smart-brain-abacus" centerSlug="smart-brain-abacus" />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: "Student Login" });
    // Pretty path keeps slug segments before any query (never brand=…/login).
    expect(link.getAttribute("href")).toBe(
      "https://edunudg-hub.vercel.app/b/smart-brain-abacus/centers/smart-brain-abacus/student-login"
    );
    expect(link.getAttribute("href")).not.toMatch(/brand=[^&]*\/login/);
  });
});
