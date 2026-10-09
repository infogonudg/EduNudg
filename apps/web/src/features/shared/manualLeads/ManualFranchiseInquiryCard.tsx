import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, FormGrid, Input, MutationError, Textarea } from "@edunudg/ui";
import { createFranchiseInquiryStaff } from "@/lib/manualLeadsApi";
import { PHONE_INPUT_PLACEHOLDER } from "@/lib/phoneInput";
import { useMutationError } from "@/features/platform/hooks/useMutationError";
import "@/features/platform/brandDetailPage.css";
import "@/features/brand/franchiseApplications/franchiseApplications.css";

type Props = {
  brandId: string;
  open: boolean;
  onClose: () => void;
};

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  proposedName: "",
  pincode: "",
  state: "",
  addressLine: "",
  priorExperience: "",
  message: "",
};

export function ManualFranchiseInquiryCard({ brandId, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const qc = useQueryClient();
  const { error, clear, capture } = useMutationError();
  const [form, setForm] = useState(emptyForm);

  const setField = (key: keyof typeof emptyForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) return;
    setForm(emptyForm);
  }, [open]);

  const save = useMutation({
    mutationFn: async () => {
      clear();
      const { error: err } = await createFranchiseInquiryStaff(brandId, {
        fullName: form.fullName,
        email: form.email,
        phoneE164: form.phone,
        city: form.city,
        proposedFranchiseName: form.proposedName,
        pincode: form.pincode,
        state: form.state,
        addressLine: form.addressLine,
        priorExperience: form.priorExperience,
        message: form.message,
      });
      if (err) throw new Error(err);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["franchise-inquiries", brandId] });
      onClose();
    },
    onError: capture,
  });

  const handleClose = () => {
    if (save.isPending) return;
    clear();
    onClose();
  };

  const canSubmit = Boolean(form.fullName.trim() && form.email.trim() && form.phone.trim());

  return (
    <dialog
      ref={dialogRef}
      className="ed-import-dialog ed-franchise-app-manual-dialog"
      aria-labelledby="manual-franchise-title"
      onClose={handleClose}
      onClick={(event) => event.target === dialogRef.current && handleClose()}
    >
      <div className="ed-import-dialog__panel" role="document">
        <header className="ed-import-dialog__header">
          <h2 id="manual-franchise-title">Add franchise application</h2>
          <button type="button" className="ed-import-dialog__close" aria-label="Close" onClick={handleClose}>
            ×
          </button>
        </header>

        <div className="ed-import-dialog__body">
          <p className="ed-import-dialog__intro">
            Record a walk-in or phone enquiry. Same fields as the public apply form on your brand site.
          </p>
          <MutationError message={error} />

          <div className="ed-franchise-app-manual-dialog__sections">
            <section className="ed-franchise-app-detail__card">
              <h3 className="ed-franchise-app-detail__card-title">Applicant</h3>
              <FormGrid>
                <Input label="Full name" value={form.fullName} onChange={setField("fullName")} autoComplete="name" />
                <Input label="Email" value={form.email} onChange={setField("email")} type="email" autoComplete="email" />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={setField("phone")}
                  placeholder={PHONE_INPUT_PLACEHOLDER}
                  autoComplete="tel"
                />
                <Input label="Proposed franchise name" value={form.proposedName} onChange={setField("proposedName")} />
              </FormGrid>
            </section>

            <section className="ed-franchise-app-detail__card">
              <h3 className="ed-franchise-app-detail__card-title">Proposed location</h3>
              <FormGrid>
                <Input label="Preferred city" value={form.city} onChange={setField("city")} autoComplete="address-level2" />
                <Input label="State" value={form.state} onChange={setField("state")} />
                <Input label="Pincode" value={form.pincode} onChange={setField("pincode")} />
                <Input label="Address" value={form.addressLine} onChange={setField("addressLine")} />
              </FormGrid>
            </section>

            <section className="ed-franchise-app-detail__card ed-franchise-app-detail__card--wide">
              <h3 className="ed-franchise-app-detail__card-title">Background</h3>
              <Textarea label="Prior experience" value={form.priorExperience} onChange={setField("priorExperience")} rows={3} />
              <Textarea label="Message (optional)" value={form.message} onChange={setField("message")} rows={3} />
            </section>
          </div>
        </div>

        <footer className="ed-import-dialog__footer">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => save.mutate()} disabled={!canSubmit || save.isPending}>
            {save.isPending ? "Creating…" : "Create application"}
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
