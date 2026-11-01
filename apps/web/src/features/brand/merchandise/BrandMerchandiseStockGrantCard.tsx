import { Button, SaveButton } from "@edunudg/ui";
import {
  BrandMerchandiseStockFormFields,
  type StockForm,
} from "./BrandMerchandiseStockFormFields";
import { formatStockGrantWhen, type MerchandiseStockGrantRow } from "@/lib/merchandiseStockGrantsApi";

type Option = { value: string; label: string };

type Props = {
  item: MerchandiseStockGrantRow;
  editing: boolean;
  editForm: StockForm;
  centerOptions: Option[];
  catalogOptions: Option[];
  saveDisabled: boolean;
  savePending: boolean;
  saveSaved?: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onEditFormChange: (next: StockForm) => void;
};

export function BrandMerchandiseStockGrantCard({
  item,
  editing,
  editForm,
  centerOptions,
  catalogOptions,
  saveDisabled,
  savePending,
  saveSaved = false,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onEditFormChange,
}: Props) {
  return (
    <article className="ed-brand-merch-card ed-brand-merch-card--simple">
      <div className="ed-brand-merch-card__inner">
        <div className="ed-brand-merch-card__details">
          <div className="ed-brand-merch-card__head">
            <div className="ed-brand-merch-card__title-row">
              <h3 className="ed-brand-merch-card__title">{item.catalog_name}</h3>
              <span className="ed-brand-merch-card__badge ed-brand-merch-card__badge--active">
                +{editing ? editForm.quantity || item.quantity : item.quantity}
              </span>
            </div>
            <p className="ed-brand-merch-card__price ed-brand-merch-card__price--active">{item.catalog_sku}</p>
          </div>

          {editing ? (
            <div className="ed-brand-merch-card__edit-form">
              <BrandMerchandiseStockFormFields
                form={editForm}
                onChange={onEditFormChange}
                centerOptions={centerOptions}
                catalogOptions={catalogOptions}
              />
              <div className="ed-brand-merch-card__edit-actions">
                <SaveButton
                  onClick={onSave}
                  disabled={saveDisabled}
                  pending={savePending}
                  saved={saveSaved}
                  label="Save changes"
                />
                <Button variant="ghost" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="ed-brand-merch-card__fields">
                <div className="ed-brand-merch-card__field">
                  <span>Franchise</span>
                  <strong>{item.center_label}</strong>
                </div>
                <div className="ed-brand-merch-card__field">
                  <span>Granted</span>
                  <strong>{formatStockGrantWhen(item.created_at)}</strong>
                </div>
                <div className="ed-brand-merch-card__field">
                  <span>Quantity</span>
                  <strong>{item.quantity}</strong>
                </div>
                {item.note ? (
                  <div className="ed-brand-merch-card__field">
                    <span>Note</span>
                    <strong>{item.note}</strong>
                  </div>
                ) : null}
              </div>
              <div className="ed-brand-merch-card__actions">
                <button type="button" className="ed-brand-merch-card__edit-btn" onClick={onEdit}>
                  Edit Details
                </button>
                <button
                  type="button"
                  className="ed-brand-merch-card__edit-btn"
                  aria-label={`Delete stock grant for ${item.catalog_name}`}
                  onClick={onDelete}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
