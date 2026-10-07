import { getSupabase } from "@/lib/supabase";

export type UpdateFranchiseInquiryInput = {
  fullName: string;
  email: string;
  phoneE164: string;
  city: string;
  proposedFranchiseName: string;
  addressLine: string;
  state: string;
  pincode: string;
  priorExperience: string;
  message: string;
};

/** Map raw Postgres unique-violation noise to an actionable brand-staff message. */
export function formatApproveFranchiseInquiryError(message: string): string {
  if (/franchise_centers_brand_id_slug_key/i.test(message)) {
    return "A franchise with this city or name slug already exists (including deleted ones). Retry after the unique-slug fix is applied, or use a distinct proposed franchise name.";
  }
  return message;
}

export async function updateFranchiseInquiry(
  inquiryId: string,
  input: UpdateFranchiseInquiryInput
): Promise<{ error: string | null }> {
  const { error } = await getSupabase().rpc("update_franchise_inquiry", {
    p_inquiry_id: inquiryId,
    p_full_name: input.fullName.trim(),
    p_email: input.email.trim(),
    p_phone_e164: input.phoneE164.trim(),
    p_city: input.city.trim(),
    p_proposed_franchise_name: input.proposedFranchiseName.trim(),
    p_address_line: input.addressLine.trim(),
    p_state: input.state.trim(),
    p_pincode: input.pincode.trim(),
    p_prior_experience: input.priorExperience.trim(),
    p_message: input.message.trim(),
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function approveFranchiseInquiry(
  inquiryId: string,
  options?: { centerSlug?: string; centerName?: string }
): Promise<{ centerId: string | null; error: string | null }> {
  const { data, error } = await getSupabase().rpc("approve_franchise_inquiry", {
    p_inquiry_id: inquiryId,
    p_center_slug: options?.centerSlug?.trim() || null,
    p_center_name: options?.centerName?.trim() || null,
  });
  if (error) return { centerId: null, error: formatApproveFranchiseInquiryError(error.message) };
  return { centerId: data as string, error: null };
}

export async function rejectFranchiseInquiry(
  inquiryId: string,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await getSupabase().rpc("reject_franchise_inquiry", {
    p_inquiry_id: inquiryId,
    p_reason: reason.trim(),
  });
  if (error) return { error: error.message };
  return { error: null };
}
