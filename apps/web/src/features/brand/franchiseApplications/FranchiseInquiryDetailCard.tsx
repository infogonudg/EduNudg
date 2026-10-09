import { useEffect, useState } from "react";
import { Button, FormGrid, Input, PipelineDetailPanel, Textarea } from "@edunudg/ui";
import { PhoneLink } from "@edunudg/ui";
import { isValidIndiaMobileInput, PHONE_INPUT_PLACEHOLDER } from "@/lib/phoneInput";
import type { UpdateFranchiseInquiryInput } from "@/lib/franchiseInquiriesApi";
import { mapsEmbedUrl, mapsSearchUrl } from "./franchiseApplicationsHelpers";

export interface FranchiseInquiry {
  id: string;
  full_name: string;
  email: string;
  phone_e164: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  address_line: string | null;
  proposed_franchise_name: string | null;
  prior_experience: string | null;
  message: string | null;
  status: string;
  rejected_reason: string | null;
  converted_center_id: string | null;
  created_at: string;
  updated_at: string;
}

type Props = {
  inquiry: FranchiseInquiry;
  pending: boolean;
  convertedCenterDeleted?: boolean;
  onBack?: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSaveEdit: (input: UpdateFranchiseInquiryInput) => void;
  rejectMode: boolean;
  rejectReason: string;
  onRejectReasonChange: (v: string) => void;
  onConfirmReject: () => void;
  onCancelAction: () => void;
  approvePending: boolean;
  rejectPending: boolean;
  savePending: boolean;
};

const ICON_STORE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9z" />
  </svg>
);

const ICON_MAIL = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M4 6h16v12H4z" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const ICON_PHONE = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L17 13l4 1.5v3A2 2 0 0 1 18.2 19 16 16 0 0 1 5 5.8 2 2 0 0 1 6.5 4z" />
  </svg>
);

const ICON_PIN = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

function inquiryToEditForm(inquiry: FranchiseInquiry): UpdateFranchiseInquiryInput {
  return {
    fullName: inquiry.full_name ?? "",
    email: inquiry.email ?? "",
    phoneE164: inquiry.phone_e164 ?? "",
    city: inquiry.city ?? "",
    proposedFranchiseName: inquiry.proposed_franchise_name ?? "",
    addressLine: inquiry.address_line ?? "",
    state: inquiry.state ?? "",
    pincode: inquiry.pincode ?? "",
    priorExperience: inquiry.prior_experience ?? "",
    message: inquiry.message ?? "",
  };
}

function DetailField({
  label,
  value,
  contactIcon,
  italic,
}: {
  label: string;
  value: string | null | undefined;
  contactIcon?: "mail" | "phone";
  italic?: boolean;
}) {
  const display = value?.trim() || "—";
  return (
    <div>
      <span className="ed-franchise-app-detail__field-label">{label}</span>
      <p
        className={[
          "ed-franchise-app-detail__field-value",
          contactIcon ? "ed-franchise-app-detail__field-value--contact" : "",
          italic ? "ed-franchise-app-detail__field-value--italic" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {contactIcon === "mail" ? ICON_MAIL : null}
        {contactIcon === "phone" ? ICON_PHONE : null}
        {contactIcon === "phone" && value?.trim() ? (
          <PhoneLink phone={value} />
        ) : (
          display
        )}
      </p>
    </div>
  );
}

export function FranchiseInquiryDetailCard({
  inquiry,
  pending,
  convertedCenterDeleted = false,
  onBack,
  onApprove,
  onReject,
  onSaveEdit,
  rejectMode,
  rejectReason,
  onRejectReasonChange,
  onConfirmReject,
  onCancelAction,
  approvePending,
  rejectPending,
  savePending,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => inquiryToEditForm(inquiry));

  useEffect(() => {
    setEditing(false);
    setForm(inquiryToEditForm(inquiry));
  }, [inquiry.id, inquiry.updated_at]);

  const title = inquiry.proposed_franchise_name ?? inquiry.full_name;
  const mapUrl = mapsSearchUrl(inquiry);
  const embedUrl = mapsEmbedUrl(inquiry);
  const locationLabel = [inquiry.city, inquiry.state].filter(Boolean).join(", ") || "View on Google Maps";
  const setField = (key: keyof UpdateFranchiseInquiryInput) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const canSave = Boolean(
    form.fullName.trim() && form.email.trim() && isValidIndiaMobileInput(form.phoneE164)
  );
  const showPendingActions = pending && !rejectMode;
  const actionButtons =
    showPendingActions && editing ? (
      <>
        <Button
          variant="ghost"
          onClick={() => {
            setForm(inquiryToEditForm(inquiry));
            setEditing(false);
          }}
          disabled={savePending}
        >
          Cancel
        </Button>
        <Button onClick={() => onSaveEdit(form)} disabled={!canSave || savePending}>
          {savePending ? "Saving…" : "Save application"}
        </Button>
      </>
    ) : showPendingActions ? (
      <>
        <Button
          variant="ghost"
          onClick={() => {
            setForm(inquiryToEditForm(inquiry));
            setEditing(true);
          }}
        >
          Edit
        </Button>
        <button type="button" className="ed-btn ed-btn--ghost ed-franchise-app-detail__reject" onClick={onReject}>
          Reject
        </button>
        <Button onClick={onApprove} disabled={approvePending}>
          {approvePending ? "Provisioning…" : "Approve & create center"}
        </Button>
      </>
    ) : null;

  return (
    <PipelineDetailPanel title={title} onBack={onBack}>
      <div className="ed-franchise-app-detail">
        <header className="ed-franchise-app-detail__hero">
          <div className="ed-franchise-app-detail__hero-identity">
            <div className="ed-franchise-app-detail__hero-icon">{ICON_STORE}</div>
            <div className="ed-franchise-app-detail__hero-copy">
              <h2 className="ed-franchise-app-detail__hero-title">{title}</h2>
              <p className="ed-franchise-app-detail__hero-subtitle">
                {editing ? "Edit application details" : "Proposed Center Details"}
              </p>
            </div>
          </div>
          {actionButtons ? (
            <div className="ed-franchise-app-detail__hero-actions">{actionButtons}</div>
          ) : null}
        </header>

        {editing ? (
          <div className="ed-franchise-app-detail__grid">
            <section className="ed-franchise-app-detail__card ed-franchise-app-detail__card--wide">
              <h3 className="ed-franchise-app-detail__card-title">Applicant &amp; franchise</h3>
              <FormGrid>
                <Input label="Applicant name" value={form.fullName} onChange={setField("fullName")} />
                <Input
                  label="Proposed franchise name"
                  value={form.proposedFranchiseName}
                  onChange={setField("proposedFranchiseName")}
                  placeholder="e.g. Smart Brain Abacus Parli"
                />
                <Input label="Email address" value={form.email} onChange={setField("email")} type="email" />
                <Input
                  label="Phone / WhatsApp"
                  value={form.phoneE164}
                  onChange={setField("phoneE164")}
                  placeholder={PHONE_INPUT_PLACEHOLDER}
                />
              </FormGrid>
            </section>

            <section className="ed-franchise-app-detail__card ed-franchise-app-detail__card--wide">
              <h3 className="ed-franchise-app-detail__card-title">Proposed location</h3>
              <FormGrid>
                <Input label="City" value={form.city} onChange={setField("city")} />
                <Input label="State" value={form.state} onChange={setField("state")} />
                <Input label="Pincode" value={form.pincode} onChange={setField("pincode")} />
                <Input label="Address" value={form.addressLine} onChange={setField("addressLine")} />
              </FormGrid>
            </section>

            <section className="ed-franchise-app-detail__card ed-franchise-app-detail__card--wide">
              <h3 className="ed-franchise-app-detail__card-title">Notes after discussion</h3>
              <FormGrid>
                <Textarea
                  label="Prior experience"
                  value={form.priorExperience}
                  onChange={setField("priorExperience")}
                  rows={3}
                />
                <Textarea label="Additional notes" value={form.message} onChange={setField("message")} rows={3} />
              </FormGrid>
            </section>
          </div>
        ) : (
          <div className="ed-franchise-app-detail__grid">
            <section className="ed-franchise-app-detail__card">
              <h3 className="ed-franchise-app-detail__card-title">Applicant Information</h3>
              <div className="ed-franchise-app-detail__fields ed-franchise-app-detail__fields--split">
                <DetailField label="Applicant name" value={inquiry.full_name} />
                <DetailField label="Proposed name" value={inquiry.proposed_franchise_name} />
                <DetailField label="Email address" value={inquiry.email} contactIcon="mail" />
                <DetailField label="Phone / WhatsApp" value={inquiry.phone_e164} contactIcon="phone" />
              </div>
            </section>

            <section className="ed-franchise-app-detail__card">
              <h3 className="ed-franchise-app-detail__card-title">Proposed Location</h3>
              <div className="ed-franchise-app-detail__fields ed-franchise-app-detail__fields--split">
                <DetailField label="City" value={inquiry.city} />
                <DetailField label="State" value={inquiry.state} />
                <DetailField label="Pincode" value={inquiry.pincode} />
                <DetailField label="Address" value={inquiry.address_line} />
              </div>
              {embedUrl && mapUrl ? (
                <div className="ed-franchise-app-detail__map">
                  <iframe
                    title={`Google Map for ${locationLabel}`}
                    src={embedUrl}
                    className="ed-franchise-app-detail__map-frame"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                  <a
                    className="ed-franchise-app-detail__map-label"
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {ICON_PIN}
                    Open {locationLabel} in Google Maps
                  </a>
                </div>
              ) : (
                <p className="ed-franchise-app-detail__map-empty">No location details provided yet.</p>
              )}
            </section>

            <section className="ed-franchise-app-detail__card ed-franchise-app-detail__card--wide">
              <h3 className="ed-franchise-app-detail__card-title">Background &amp; Experience</h3>
              <DetailField
                label="Prior experience"
                value={inquiry.prior_experience?.trim() || "Not provided"}
                italic
              />
            </section>

            {inquiry.message?.trim() ? (
              <section className="ed-franchise-app-detail__card ed-franchise-app-detail__card--wide">
                <h3 className="ed-franchise-app-detail__card-title">Additional notes</h3>
                <p className="ed-franchise-app-detail__message">{inquiry.message}</p>
              </section>
            ) : null}

            {inquiry.rejected_reason ? (
              <section className="ed-franchise-app-detail__card ed-franchise-app-detail__card--wide">
                <h3 className="ed-franchise-app-detail__card-title">Rejection reason</h3>
                <p className="ed-franchise-app-detail__message">{inquiry.rejected_reason}</p>
              </section>
            ) : null}

            {inquiry.converted_center_id && convertedCenterDeleted ? (
              <p className="ed-franchise-app-detail__meta">
                This franchise was deleted from Franchise Management. The application is kept for history.
              </p>
            ) : inquiry.converted_center_id ? (
              <p className="ed-franchise-app-detail__meta">
                Center provisioned (ID {inquiry.converted_center_id.slice(0, 8)}…)
              </p>
            ) : null}
          </div>
        )}

        {rejectMode ? (
          <div className="ed-franchise-app-detail__reject-panel">
            <Input label="Rejection reason (required)" value={rejectReason} onChange={onRejectReasonChange} />
            <div className="ed-franchise-app-detail__reject-actions">
              <Button variant="danger" onClick={onConfirmReject} disabled={!rejectReason.trim() || rejectPending}>
                {rejectPending ? "Rejecting…" : "Confirm reject"}
              </Button>
              <Button variant="ghost" onClick={onCancelAction}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {!rejectMode && pending && !editing ? (
          <p className="ed-franchise-app-detail__meta">
            After your call, edit the application to fill proposed name and address, then approve. Approving creates
            a franchise center; the slug comes from the proposed name (or city).
          </p>
        ) : null}
      </div>
    </PipelineDetailPanel>
  );
}
