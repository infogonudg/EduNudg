import { useEffect, useRef, useState } from "react";
import { Button, Input, MutationError } from "@edunudg/ui";
import { submitFranchiseInquiry } from "@/lib/brandLandingApi";
import { submitBrandStudentApplication, submitCenterStudentRegistration } from "@/lib/leadsApi";
import { isIndiaPincode } from "@/lib/leadSla";
import { INDIA_MOBILE_INVALID_MESSAGE, isValidIndiaMobileInput } from "@/lib/phoneInput";
import type { MarketingTheme } from "@/types/homepage";
import { useLeadModal, type LeadModalKind } from "./LeadModalContext";
import { resolveLeadModalKind } from "./resolveLeadModalKind";

export { resolveLeadModalKind };

type Props = {
  brandSlug: string;
  /** When set, enroll modal submits center registration (Path B) instead of brand application. */
  centerSlug?: string;
  /** Spark Academy skins the dialog to Inter / navy / pill CTAs. */
  theme?: MarketingTheme;
};

export function AcModalShell({
  title,
  open,
  onClose,
  children,
  appearance = "abacus-classic",
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  appearance?: "abacus-classic" | "spark-academy" | "edu-learn";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isSpark = appearance === "spark-academy";
  const isEduLearn = appearance === "edu-learn";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={isEduLearn ? "ac-modal ac-modal--edu-learn" : isSpark ? "ac-modal ac-modal--spark" : "ac-modal"}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
    >
      <div className="ac-modal__panel" role="document">
        <header className="ac-modal__header">
          <h2>{title}</h2>
          <button type="button" className="ac-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="ac-modal__body">{children}</div>
      </div>
    </dialog>
  );
}

function EnrollForm({
  brandSlug,
  centerSlug,
  onSuccess,
}: {
  brandSlug: string;
  centerSlug?: string;
  onSuccess: () => void;
}) {
  const [parentName, setParentName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [childName, setChildName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isCenter = Boolean(centerSlug);
  const pincodeValid = isCenter
    ? !pincode.trim() || isIndiaPincode(pincode)
    : isIndiaPincode(pincode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincodeValid) {
      setError(
        isCenter
          ? "Enter a valid 6-digit India pincode or leave blank."
          : "Enter a valid 6-digit India pincode."
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = isCenter && centerSlug
      ? await submitCenterStudentRegistration(brandSlug, centerSlug, {
          parentName,
          whatsappE164: whatsapp,
          email,
          city: city || undefined,
          pincode: pincode || undefined,
          childName,
        })
      : await submitBrandStudentApplication(brandSlug, {
          parentName,
          whatsappE164: whatsapp,
          email,
          city,
          pincode,
          childName,
        });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    onSuccess();
  };

  if (done) {
    return (
      <p className="ac-modal__success" role="status">
        {isCenter
          ? "Registration received. Expect a call from our center soon."
          : "Application received. A center will contact you on WhatsApp."}
      </p>
    );
  }

  return (
    <form className="ac-modal__form" onSubmit={(e) => void handleSubmit(e)}>
      <MutationError message={error} />
      <div className="ac-modal__grid">
        <Input label="Parent name" value={parentName} onChange={setParentName} />
        <Input label="WhatsApp number" value={whatsapp} onChange={setWhatsapp} />
        <Input label="Email" value={email} onChange={setEmail} type="email" />
        <Input label="Child name" value={childName} onChange={setChildName} />
        <Input
          label={isCenter ? "City (optional)" : "City"}
          value={city}
          onChange={setCity}
        />
        <Input
          label={isCenter ? "Pincode (optional)" : "Pincode"}
          value={pincode}
          onChange={setPincode}
          placeholder="6 digits"
        />
      </div>
      <Button
        type="submit"
        block
        disabled={
          submitting ||
          !parentName.trim() ||
          !whatsapp.trim() ||
          !email.trim() ||
          !childName.trim() ||
          (!isCenter && !city.trim()) ||
          (!isCenter && !pincodeValid) ||
          (isCenter && !pincodeValid)
        }
      >
        {submitting
          ? "Submitting…"
          : isCenter
            ? "Register for a free trial"
            : "Book free demo"}
      </Button>
    </form>
  );
}

function FranchiseForm({ brandSlug, onSuccess }: { brandSlug: string; onSuccess: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [qualification, setQualification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const phoneValid = isValidIndiaMobileInput(phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and WhatsApp number are required.");
      return;
    }
    if (!phoneValid) {
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
      message: qualification ? `Qualification: ${qualification}` : undefined,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
    onSuccess();
  };

  if (done) {
    return (
      <p className="ac-modal__success" role="status">
        Thank you — we received your franchise application.
      </p>
    );
  }

  return (
    <form className="ac-modal__form" onSubmit={(e) => void handleSubmit(e)}>
      <MutationError message={error} />
      <div className="ac-modal__grid">
        <Input label="Full name" value={fullName} onChange={setFullName} />
        <Input label="Email" value={email} onChange={setEmail} type="email" />
        <Input label="WhatsApp number" value={phone} onChange={setPhone} />
        <Input label="City" value={city} onChange={setCity} />
        <Input label="Educational qualification" value={qualification} onChange={setQualification} />
      </div>
      <Button
        type="submit"
        block
        disabled={submitting || !fullName.trim() || !email.trim() || !phoneValid}
      >
        {submitting ? "Submitting…" : "Apply for franchise"}
      </Button>
    </form>
  );
}

const MODAL_TITLES: Record<Exclude<LeadModalKind, null>, string> = {
  enroll: "Book a free demo class",
  apply: "Apply for franchise",
};

export function MarketingLeadModals({ brandSlug, centerSlug, theme }: Props) {
  const { activeModal, closeModal } = useLeadModal();
  const enrollTitle = centerSlug ? "Book a free trial at this center" : MODAL_TITLES.enroll;
  const appearance =
    theme === "spark-academy" ? "spark-academy" : theme === "edu-learn" ? "edu-learn" : "abacus-classic";

  return (
    <>
      <AcModalShell
        title={enrollTitle}
        open={activeModal === "enroll"}
        onClose={closeModal}
        appearance={appearance}
      >
        <EnrollForm
          brandSlug={brandSlug}
          centerSlug={centerSlug}
          onSuccess={() => setTimeout(closeModal, 2000)}
        />
      </AcModalShell>
      <AcModalShell
        title={MODAL_TITLES.apply}
        open={activeModal === "apply"}
        onClose={closeModal}
        appearance={appearance}
      >
        <FranchiseForm brandSlug={brandSlug} onSuccess={() => setTimeout(closeModal, 2000)} />
      </AcModalShell>
    </>
  );
}

export function AbacusCtaButton({
  label,
  href,
  variant = "primary",
  className = "",
}: {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "nav-enroll" | "nav-apply";
  className?: string;
}) {
  const modal = useLeadModal();
  const modalKind = resolveLeadModalKind(href);

  if (modalKind) {
    return (
      <button
        type="button"
        className={`ac-btn ac-btn--${variant} ${className}`.trim()}
        onClick={() => modal.openModal(modalKind)}
      >
        {label}
      </button>
    );
  }

  return (
    <a href={href} className={`ac-btn ac-btn--${variant} ${className}`.trim()}>
      {label}
    </a>
  );
}
