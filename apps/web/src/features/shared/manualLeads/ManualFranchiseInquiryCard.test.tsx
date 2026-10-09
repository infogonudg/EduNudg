import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ManualFranchiseInquiryCard } from "./ManualFranchiseInquiryCard";

const createFranchiseInquiryStaff = vi.fn();

vi.mock("@/lib/manualLeadsApi", () => ({
  createFranchiseInquiryStaff: (...args: unknown[]) => createFranchiseInquiryStaff(...args),
}));

function polyfillDialog() {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
}

describe("ManualFranchiseInquiryCard", () => {
  beforeEach(() => {
    polyfillDialog();
    createFranchiseInquiryStaff.mockReset();
    createFranchiseInquiryStaff.mockResolvedValue({ id: "inq-1", error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("regression_manual_franchise_requires_phone", () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ManualFranchiseInquiryCard brandId="brand-1" open onClose={vi.fn()} />
      </QueryClientProvider>
    );

    const create = screen.getByRole("button", { name: "Create application" });
    expect(create).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Rao" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "asha@example.com" } });
    expect(create).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "1234abc" } });
    expect(create).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "9890200000" } });
    expect(create).toHaveProperty("disabled", false);
  });

  it("regression_manual_franchise_matches_public_apply_fields", async () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={qc}>
        <ManualFranchiseInquiryCard brandId="brand-1" open onClose={onClose} />
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { name: "Add franchise application" })).toBeDefined();
    expect(document.querySelector(".ed-franchise-app-manual-dialog")).not.toBeNull();
    expect(screen.getByLabelText("Full name")).toBeDefined();
    expect(screen.getByLabelText("Preferred city")).toBeDefined();
    expect(screen.getByLabelText("Pincode")).toBeDefined();
    expect(screen.getByLabelText("State")).toBeDefined();
    expect(screen.getByLabelText("Address")).toBeDefined();
    expect(screen.getByLabelText("Phone").getAttribute("placeholder")).toBe("9890200000");
    expect(screen.getByLabelText("Message (optional)")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Rao" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "asha@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+919876543210" } });
    fireEvent.change(screen.getByLabelText("Preferred city"), { target: { value: "Pune" } });
    fireEvent.change(screen.getByLabelText("Proposed franchise name"), { target: { value: "Abacus Pune" } });
    fireEvent.change(screen.getByLabelText("Pincode"), { target: { value: "411001" } });
    fireEvent.change(screen.getByLabelText("State"), { target: { value: "Maharashtra" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "42 FC Road" } });
    fireEvent.change(screen.getByLabelText("Prior experience"), { target: { value: "Tutoring" } });

    fireEvent.click(screen.getByRole("button", { name: "Create application" }));

    await vi.waitFor(() => {
      expect(createFranchiseInquiryStaff).toHaveBeenCalledWith("brand-1", {
        fullName: "Asha Rao",
        email: "asha@example.com",
        phoneE164: "+919876543210",
        city: "Pune",
        proposedFranchiseName: "Abacus Pune",
        pincode: "411001",
        state: "Maharashtra",
        addressLine: "42 FC Road",
        priorExperience: "Tutoring",
        message: "",
      });
    });
    expect(onClose).toHaveBeenCalled();
  });
});
