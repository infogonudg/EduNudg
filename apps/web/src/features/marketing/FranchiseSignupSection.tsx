import { useState } from "react";
import { Button, Input, MutationError } from "@edunudg/ui";
import { submitFranchiseInquiry } from "@/lib/brandLandingApi";
import { INDIA_MOBILE_INVALID_MESSAGE, isValidIndiaMobileInput } from "@/lib/phoneInput";
import { EnquiryPromoSection } from "./EnquiryPromoSection";

type Props = {
  brandSlug: string;
};

export function FranchiseSignupSection({ brandSlug }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [proposedName, setProposedName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [priorExperience, setPriorExperience] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and phone are required.");
      return;
    }
    if (!isValidIndiaMobileInput(phone)) {
      setError(INDIA_MOBILE_INVALID_MESSAGE);
      return;
    }

    setSubmitting(true);
    setError(null);
    const { error: err } = await submitFranchiseInquiry(brandSlug, {
      fullName,
      email,
      phone,
      city,
      message,
      proposedFranchiseName: proposedName,
      addressLine,
      state,
      pincode,
      priorExperience,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSubmitted(true);
  };

  return (
    <EnquiryPromoSection
      id="apply"
      accent="franchise"
      eyebrow="Franchise opportunity"
      title="Own an abacus center in your city"
      subtitle="Join a proven program with curriculum, marketing, and operations support. Applications take about 3 minutes."
      perks={[
        "Full training & onboarding playbook",
        "Brand marketing assets & parent leads",
        "Dedicated success manager",
      ]}
    >
      <div className="novu-franchise-apply__card">
        <h2>Start your application</h2>
        <p>Tell us about yourself — we respond within 2 business days.</p>

        {submitted ? (
          <p className="novu-franchise-apply__success" role="status">
            Thank you—we received your application and will be in touch shortly.
          </p>
        ) : (
          <form className="novu-franchise-apply__form" onSubmit={(e) => void handleSubmit(e)}>
            <div className="novu-franchise-apply__grid">
              <Input label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
              <Input label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
              <Input label="Phone" value={phone} onChange={setPhone} placeholder="9890200000" autoComplete="tel" />
              <Input label="Preferred city" value={city} onChange={setCity} autoComplete="address-level2" />
              <Input label="Proposed franchise name" value={proposedName} onChange={setProposedName} />
              <Input label="Pincode" value={pincode} onChange={setPincode} />
              <Input label="State" value={state} onChange={setState} />
            </div>
            <Input label="Address" value={addressLine} onChange={setAddressLine} />
            <label className="ed-field">
              <span className="ed-field__label">Prior experience</span>
              <textarea
                className="ed-field__input novu-franchise-apply__textarea"
                value={priorExperience}
                rows={3}
                onChange={(e) => setPriorExperience(e.target.value)}
              />
            </label>
            <label className="ed-field">
              <span className="ed-field__label">Message (optional)</span>
              <textarea
                className="ed-field__input novu-franchise-apply__textarea"
                value={message}
                rows={4}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your background, timeline, or questions…"
              />
            </label>
            <MutationError message={error} />
            <Button
              type="submit"
              disabled={
                submitting ||
                !fullName.trim() ||
                !email.trim() ||
                !isValidIndiaMobileInput(phone)
              }
              block
            >
              {submitting ? "Submitting…" : "Submit franchise application"}
            </Button>
          </form>
        )}
      </div>
    </EnquiryPromoSection>
  );
}
