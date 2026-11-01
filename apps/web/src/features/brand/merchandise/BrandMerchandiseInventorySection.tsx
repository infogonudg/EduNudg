import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormGrid, Input, MutationError, PipelineWorkspace, Select } from "@edunudg/ui";
import { useOpsBreakpoint } from "@/features/center/hooks/useOpsBreakpoint";
import { fetchBrandCenters } from "@/lib/centerCentersApi";
import { listMerchandiseCatalog } from "@/lib/merchandiseOrdersApi";
import {
  filterMerchandiseStockGrants,
  formatStockGrantWhen,
  grantCenterMerchandiseStock,
  listBrandMerchandiseStockGrants,
  type MerchandiseStockGrantRow,
} from "@/lib/merchandiseStockGrantsApi";
import { useMutationError } from "@/features/platform/hooks/useMutationError";
import { BrandMerchandiseAddStockPanel } from "./BrandMerchandiseAddStockPanel";
import { MerchandisePipelineListItem } from "./MerchandisePipelineListItem";
import "./brandMerchandiseCatalog.css";

type Props = {
  brandId: string;
  formOpen?: boolean;
  onFormOpenChange?: (open: boolean) => void;
  search?: string;
};

type StockForm = {
  centerId: string;
  catalogItemId: string;
  quantity: string;
  note: string;
};

const emptyForm = (): StockForm => ({
  centerId: "",
  catalogItemId: "",
  quantity: "1",
  note: "",
});

export function BrandMerchandiseInventorySection({
  brandId,
  formOpen = false,
  onFormOpenChange,
  search = "",
}: Props) {
  const qc = useQueryClient();
  const { error, clear, capture } = useMutationError();
  const { isDesktop } = useOpsBreakpoint();
  const [form, setForm] = useState<StockForm>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const grants = useQuery({
    queryKey: ["merchandise-stock-grants", brandId],
    enabled: !!brandId,
    queryFn: () => listBrandMerchandiseStockGrants(brandId),
  });

  const centers = useQuery({
    queryKey: ["brand-centers", brandId],
    enabled: !!brandId && formOpen,
    queryFn: () => fetchBrandCenters(brandId),
  });

  const catalog = useQuery({
    queryKey: ["merchandise-catalog", brandId],
    enabled: !!brandId && formOpen,
    queryFn: () => listMerchandiseCatalog(brandId),
  });

  const allItems = grants.data ?? [];
  const filteredItems = useMemo(() => filterMerchandiseStockGrants(allItems, search), [allItems, search]);

  useEffect(() => {
    if (formOpen) return;
    if (selectedId && filteredItems.some((item) => item.id === selectedId)) return;
    setSelectedId(filteredItems[0]?.id ?? null);
  }, [filteredItems, formOpen, selectedId]);

  useEffect(() => {
    if (!formOpen) return;
    const centerOptions = centers.data ?? [];
    const catalogOptions = (catalog.data ?? []).filter((item) => item.is_active);
    setForm((prev) => ({
      ...prev,
      centerId: prev.centerId || centerOptions[0]?.id || "",
      catalogItemId: prev.catalogItemId || catalogOptions[0]?.id || "",
    }));
  }, [formOpen, centers.data, catalog.data]);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["merchandise-stock-grants", brandId] });

  const closeAddForm = () => {
    setForm(emptyForm());
    onFormOpenChange?.(false);
  };

  const qty = Number.parseInt(form.quantity, 10);
  const canSubmit =
    Boolean(form.centerId && form.catalogItemId) && Number.isFinite(qty) && qty >= 1;

  const create = useMutation({
    mutationFn: async () => {
      clear();
      return grantCenterMerchandiseStock({
        brandId,
        centerId: form.centerId,
        catalogItemId: form.catalogItemId,
        quantity: qty,
        note: form.note,
      });
    },
    onSuccess: (grantId) => {
      invalidate();
      setForm(emptyForm());
      setSelectedId(grantId);
      onFormOpenChange?.(false);
    },
    onError: capture,
  });

  const selectedItem = filteredItems.find((item) => item.id === selectedId) ?? null;

  const centerOptions = (centers.data ?? [])
    .filter((center) => center.status === "active" || center.status === "pending")
    .map((center) => ({
      value: center.id,
      label: center.display_name?.trim() || center.name,
    }));

  const catalogOptions = (catalog.data ?? [])
    .filter((item) => item.is_active)
    .map((item) => ({
      value: item.id,
      label: `${item.name} (${item.sku})`,
    }));

  const addPanel = (
    <BrandMerchandiseAddStockPanel
      open={formOpen}
      onSubmit={() => create.mutate()}
      onClose={closeAddForm}
      submitDisabled={!canSubmit}
      submitPending={create.isPending}
    >
      <FormGrid>
        <Select
          label="Franchise"
          value={form.centerId}
          onChange={(value) => setForm((prev) => ({ ...prev, centerId: value }))}
          options={centerOptions}
        />
        <Select
          label="SKU"
          value={form.catalogItemId}
          onChange={(value) => setForm((prev) => ({ ...prev, catalogItemId: value }))}
          options={catalogOptions}
        />
        <Input
          label="Quantity"
          type="number"
          value={form.quantity}
          onChange={(value) => setForm((prev) => ({ ...prev, quantity: value }))}
        />
        <Input
          label="Note (optional)"
          value={form.note}
          onChange={(value) => setForm((prev) => ({ ...prev, note: value }))}
        />
      </FormGrid>
    </BrandMerchandiseAddStockPanel>
  );

  const emptyCopy = allItems.length === 0 ? "No stock grants yet." : "No stock grants match this view.";
  const listEmpty = !grants.isLoading && filteredItems.length === 0 && !formOpen ? (
    <p className="ed-brand-merch-catalog__empty">{emptyCopy}</p>
  ) : null;

  const listPanel = grants.isLoading ? (
    <p className="ed-text-sm ed-muted">Loading stock grants…</p>
  ) : filteredItems.length === 0 ? (
    listEmpty
  ) : (
    <div className="ed-franchise-apps-page__desktop-list">
      {filteredItems.map((item) => (
        <MerchandisePipelineListItem
          key={item.id}
          selected={item.id === selectedId}
          badge={`+${item.quantity}`}
          badgeTone="approved"
          when={formatStockGrantWhen(item.created_at)}
          title={item.catalog_name}
          location={`${item.center_label} · ${item.catalog_sku}`}
          onClick={() => {
            setSelectedId(item.id);
            onFormOpenChange?.(false);
          }}
        />
      ))}
    </div>
  );

  const renderDetail = (item: MerchandiseStockGrantRow) => (
    <div className="ed-brand-merch-catalog">
      <article className="ed-brand-merch-card ed-brand-merch-card--simple">
        <div className="ed-brand-merch-card__inner">
          <div className="ed-brand-merch-card__details">
            <div className="ed-brand-merch-card__head">
              <div className="ed-brand-merch-card__title-row">
                <h3 className="ed-brand-merch-card__title">{item.catalog_name}</h3>
                <span className="ed-brand-merch-card__badge ed-brand-merch-card__badge--active">
                  +{item.quantity}
                </span>
              </div>
              <p className="ed-brand-merch-card__price ed-brand-merch-card__price--active">
                {item.catalog_sku}
              </p>
            </div>
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
          </div>
        </div>
      </article>
    </div>
  );

  const detailPanel = formOpen ? (
    addPanel
  ) : selectedItem ? (
    renderDetail(selectedItem)
  ) : (
    <div className="ed-franchise-apps-page__placeholder">
      <p className="ed-text-sm ed-muted">Select a stock grant to review franchise, SKU, and quantity.</p>
    </div>
  );

  return (
    <>
      <MutationError message={error} />

      {isDesktop ? (
        <PipelineWorkspace detailOpen={!!selectedItem || formOpen} list={listPanel} detail={detailPanel} />
      ) : (
        <>
          {addPanel}
          <div className="ed-brand-merch-catalog">
            {grants.isLoading ? <p className="ed-text-sm ed-muted">Loading stock grants…</p> : null}
            {listEmpty}
            {filteredItems.map((item) => (
              <div key={item.id}>{renderDetail(item)}</div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
