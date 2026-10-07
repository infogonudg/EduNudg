import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  approveFranchiseInquiry,
  formatApproveFranchiseInquiryError,
  rejectFranchiseInquiry,
  updateFranchiseInquiry,
} from "./franchiseInquiriesApi";

const rpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({ rpc }),
}));

describe("franchiseInquiriesApi", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("approveFranchiseInquiry calls RPC", async () => {
    rpc.mockResolvedValue({ data: "center-1", error: null });
    const result = await approveFranchiseInquiry("inq-1", { centerSlug: "koramangala" });
    expect(result).toEqual({ centerId: "center-1", error: null });
    expect(rpc).toHaveBeenCalledWith("approve_franchise_inquiry", {
      p_inquiry_id: "inq-1",
      p_center_slug: "koramangala",
      p_center_name: null,
    });
  });

  it("regression_approve_maps_duplicate_slug_constraint_to_clear_message", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'duplicate key value violates unique constraint "franchise_centers_brand_id_slug_key"',
      },
    });
    const result = await approveFranchiseInquiry("inq-dup");
    expect(result.centerId).toBeNull();
    expect(result.error).toMatch(/already exists/i);
    expect(formatApproveFranchiseInquiryError("other")).toBe("other");
  });

  it("rejectFranchiseInquiry calls RPC with reason", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const result = await rejectFranchiseInquiry("inq-2", "Out of territory");
    expect(result).toEqual({ error: null });
    expect(rpc).toHaveBeenCalledWith("reject_franchise_inquiry", {
      p_inquiry_id: "inq-2",
      p_reason: "Out of territory",
    });
  });

  it("updateFranchiseInquiry calls RPC with edited fields", async () => {
    rpc.mockResolvedValue({ data: { id: "inq-3" }, error: null });
    const result = await updateFranchiseInquiry("inq-3", {
      fullName: "Priya Kakani",
      email: "priya@example.com",
      phoneE164: "+919518966877",
      city: "Parli Vaijanath",
      proposedFranchiseName: "Smart Brain Abacus Parli",
      addressLine: "Kakani Sadan",
      state: "Maharashtra",
      pincode: "431515",
      priorExperience: "Tutoring",
      message: "Call done",
    });
    expect(result).toEqual({ error: null });
    expect(rpc).toHaveBeenCalledWith("update_franchise_inquiry", {
      p_inquiry_id: "inq-3",
      p_full_name: "Priya Kakani",
      p_email: "priya@example.com",
      p_phone_e164: "+919518966877",
      p_city: "Parli Vaijanath",
      p_proposed_franchise_name: "Smart Brain Abacus Parli",
      p_address_line: "Kakani Sadan",
      p_state: "Maharashtra",
      p_pincode: "431515",
      p_prior_experience: "Tutoring",
      p_message: "Call done",
    });
  });
});
