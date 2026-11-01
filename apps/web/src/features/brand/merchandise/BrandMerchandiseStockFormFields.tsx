import { FormGrid, Input, Select } from "@edunudg/ui";

export type StockForm = {
  centerId: string;
  catalogItemId: string;
  quantity: string;
  note: string;
};

export function emptyStockForm(): StockForm {
  return {
    centerId: "",
    catalogItemId: "",
    quantity: "1",
    note: "",
  };
}

type Option = { value: string; label: string };

type Props = {
  form: StockForm;
  onChange: (next: StockForm) => void;
  centerOptions: Option[];
  catalogOptions: Option[];
};

export function BrandMerchandiseStockFormFields({
  form,
  onChange,
  centerOptions,
  catalogOptions,
}: Props) {
  const patch = (partial: Partial<StockForm>) => onChange({ ...form, ...partial });

  return (
    <FormGrid>
      <Select
        label="Franchise"
        value={form.centerId}
        onChange={(value) => patch({ centerId: value })}
        options={centerOptions}
      />
      <Select
        label="SKU"
        value={form.catalogItemId}
        onChange={(value) => patch({ catalogItemId: value })}
        options={catalogOptions}
      />
      <Input
        label="Quantity"
        type="number"
        value={form.quantity}
        onChange={(value) => patch({ quantity: value })}
      />
      <Input
        label="Note (optional)"
        value={form.note}
        onChange={(value) => patch({ note: value })}
      />
    </FormGrid>
  );
}

export function stockFormQuantity(form: StockForm): number {
  return Number.parseInt(form.quantity, 10);
}

export function isStockFormValid(form: StockForm): boolean {
  const qty = stockFormQuantity(form);
  return Boolean(form.centerId && form.catalogItemId) && Number.isFinite(qty) && qty >= 1;
}
