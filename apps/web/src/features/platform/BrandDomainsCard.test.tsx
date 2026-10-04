import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@edunudg/ui";
import { BrandDomainsCard } from "./BrandDomainsCard";
import { exactAccessibleName } from "@/test/exactAccessibleName";

const upsertBrandDomainMapping = vi.hoisted(() => vi.fn());
const deleteBrandDomainMapping = vi.hoisted(() => vi.fn());

vi.mock("@/lib/brandDomainMappingApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/brandDomainMappingApi")>(
    "@/lib/brandDomainMappingApi"
  );
  return {
    ...actual,
    upsertBrandDomainMapping,
    deleteBrandDomainMapping,
  };
});

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <BrandDomainsCard
          brandId="brand-1"
          brandSlug="smart-brain-abacus"
          domains={[
            { hostname: "www.example.com", portal_type: "brand", is_primary: true },
            { hostname: "pune.smart-brain-abacus.localhost", portal_type: "center", is_primary: false },
          ]}
          domainsPage={1}
          onDomainsPageChange={() => undefined}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("BrandDomainsCard", () => {
  beforeEach(() => {
    upsertBrandDomainMapping.mockReset();
    deleteBrandDomainMapping.mockReset();
    upsertBrandDomainMapping.mockResolvedValue({
      hostname: "www.smartbraineducations.com",
      portal_type: "brand",
      is_primary: false,
    });
    deleteBrandDomainMapping.mockResolvedValue(undefined);
  });

  it("regression_platform_brand_domains_add_calls_upsert_rpc", async () => {
    renderCard();
    fireEvent.change(screen.getByLabelText(exactAccessibleName("Hostname")), {
      target: { value: "https://www.smartbraineducations.com/" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add domain" }));
    await waitFor(() =>
      expect(upsertBrandDomainMapping).toHaveBeenCalledWith({
        brandId: "brand-1",
        hostname: "https://www.smartbraineducations.com/",
        isPrimary: false,
      })
    );
    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/Mapping saved for www.smartbraineducations.com/);
    expect(status.textContent).toMatch(/Vercel/);
    expect(status.textContent).toMatch(/GoDaddy \/ registrar/);
    expect(status.textContent).toMatch(/Valid/);
  });

  it("regression_platform_brand_domains_remove_requires_confirm", async () => {
    renderCard();
    expect(screen.getByRole("heading", { name: "Existing custom domains" })).toBeDefined();
    expect(screen.getByText("www.example.com")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("heading", { name: "Remove this domain mapping?" })).toBeDefined();
    expect(deleteBrandDomainMapping).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Type CONFIRM to proceed/i), {
      target: { value: "CONFIRM" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(deleteBrandDomainMapping).toHaveBeenCalledWith({
        brandId: "brand-1",
        hostname: "www.example.com",
      })
    );
  });

  it("regression_platform_brand_domains_edit_prefills_form", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText(/Hostname \(editing\)/i)).toHaveProperty("value", "www.example.com");
    expect(screen.getByRole("checkbox", { name: "Primary" })).toHaveProperty("checked", true);
    expect(screen.getByRole("button", { name: "Save domain" })).toBeDefined();
  });
});
