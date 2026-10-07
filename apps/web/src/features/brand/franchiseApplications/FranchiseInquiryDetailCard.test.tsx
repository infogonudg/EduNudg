import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FranchiseInquiryDetailCard, type FranchiseInquiry } from "./FranchiseInquiryDetailCard";

const inquiry: FranchiseInquiry = {
  id: "inq-1",
  full_name: "Priya Sharma",
  email: "priya@example.com",
  phone_e164: "+919876543210",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  address_line: "42 FC Road",
  proposed_franchise_name: "Abacus Pune West",
  prior_experience: "Tutoring background",
  message: "Ready to invest",
  status: "new",
  rejected_reason: null,
  converted_center_id: null,
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-01T10:00:00Z",
};

const baseProps = {
  inquiry,
  pending: true,
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onSaveEdit: vi.fn(),
  rejectMode: false,
  rejectReason: "",
  onRejectReasonChange: vi.fn(),
  onConfirmReject: vi.fn(),
  onCancelAction: vi.fn(),
  approvePending: false,
  rejectPending: false,
  savePending: false,
};

describe("FranchiseInquiryDetailCard", () => {
  it("shows all application fields and approve flow without slug inputs", () => {
    const onApprove = vi.fn();

    render(<FranchiseInquiryDetailCard {...baseProps} onApprove={onApprove} />);

    expect(screen.getAllByText("Abacus Pune West").length).toBeGreaterThan(0);
    expect(screen.getByText("Proposed Center Details")).toBeDefined();
    expect(screen.getByText("Applicant Information")).toBeDefined();
    expect(screen.getByText("Tutoring background")).toBeDefined();
    expect(screen.getByRole("link", { name: "+919876543210" }).getAttribute("href")).toBe("tel:+919876543210");
    expect(screen.queryByLabelText("Center slug (optional)")).toBeNull();
    const edit = screen.getByRole("button", { name: "Edit" });
    expect(edit.closest(".ed-franchise-app-detail__hero-actions")).toBeTruthy();
    expect(document.querySelector(".ed-franchise-app-detail__hero-title")?.closest(".ed-franchise-app-detail__hero-identity")).toBeTruthy();
    expect(screen.getByTitle(/Google Map for Pune, Maharashtra/i)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Approve & create center" }));
    expect(onApprove).toHaveBeenCalled();
  });

  it("regression_edit_actions_live_in_hero_not_over_title", () => {
    render(<FranchiseInquiryDetailCard {...baseProps} />);
    const hero = document.querySelector(".ed-franchise-app-detail__hero");
    expect(hero?.querySelector(".ed-franchise-app-detail__hero-identity")).toBeTruthy();
    expect(hero?.querySelector(".ed-franchise-app-detail__hero-actions")).toBeTruthy();
    expect(
      hero
        ?.querySelector(".ed-franchise-app-detail__hero-actions")
        ?.contains(screen.getByRole("button", { name: "Edit" }))
    ).toBe(true);
    expect(document.querySelector(".ed-franchise-app-detail__actions")).toBeNull();
  });

  it("regression_pending_inquiry_can_edit_proposed_name_before_approve", () => {
    const onSaveEdit = vi.fn();
    render(<FranchiseInquiryDetailCard {...baseProps} onSaveEdit={onSaveEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Proposed franchise name"), {
      target: { value: "Smart Brain Abacus Parli" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Parli Vaijanath" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save application" }));

    expect(onSaveEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        proposedFranchiseName: "Smart Brain Abacus Parli",
        city: "Parli Vaijanath",
        fullName: "Priya Sharma",
      })
    );
  });

  it("regression_deleted_converted_center_explains_history_keep", () => {
    render(
      <FranchiseInquiryDetailCard
        {...baseProps}
        inquiry={{
          ...inquiry,
          status: "converted",
          converted_center_id: "center-gone",
        }}
        pending={false}
        convertedCenterDeleted
      />
    );

    expect(screen.getByText(/deleted from Franchise Management/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Approve & create center" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });
});
