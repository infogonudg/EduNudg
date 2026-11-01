import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MutationError, PipelineWorkspace } from "@edunudg/ui";
import { useOpsBreakpoint } from "@/features/center/hooks/useOpsBreakpoint";
import { fetchBrandCenters } from "@/lib/centerCentersApi";
import { listMerchandiseCatalog } from "@/lib/merchandiseOrdersApi";
import {
  deleteMerchandiseStockGrant,
  filterMerchandiseStockGrants,
  formatStockGrantWhen,
  grantCenterMerchandiseStock,
  listBrandMerchandiseStockGrants,
  updateMerchandiseStockGrant,
  type MerchandiseStockGrantRow,
} from "@/lib/merchandiseStockGrantsApi";
import { useMutationError } from "@/features/platform/hooks/useMutationError";
import { useSavedFlash } from "@/features/shared/useSavedFlash";
import { ConfirmDeleteDialog } from "@/features/shared/ConfirmDeleteDialog";
import { BrandMerchandiseAddStockPanel } from "./BrandMerchandiseAddStockPanel";
import { BrandMerchandiseStockGrantCard } from "./BrandMerchandiseStockGrantCard";
import {
  BrandMerchandiseStockFormFields,
  emptyStockForm,
  isStockFormValid,
  stockFormQuantity,
  type StockForm,
} from "./BrandMerchandiseStockFormFields";
import { MerchandisePipelineListItem } from "./MerchandisePipelineListItem";
import "./brandMerchandiseCatalog.css";

type Props = {
  brandId: string;
  formOpen?: boolean;
  onFormOpenChange?: (open: boolean) => void;
  search?: string;
};

function grantToForm(item: MerchandiseStockGrantRow): StockForm {
  return {
    centerId: item.center_id,
    catalogItemId: item.catalog_item_id,
    quantity: String(item.quantity),
    note: item.note ?? "",
  };
}

export function BrandMerchandiseInventorySection({
  brandId,
  formOpen = false,
  onFormOpenChange,
  search = "",
}: Props) {
  const qc = useQueryClient();
  const { error, clear, capture } = useMutationError();
  const grantSaved = useSavedFlash();
  const { isDesktop } = useOpsBreakpoint();
  const [form, setForm] = useState<StockForm>(emptyStockForm);
  const [editForm, setEditForm] = useState<StockForm>(emptyStockForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const needsLookups = formOpen || !!editingId;

  const grants = useQuery({
    queryKey: ["merchandise-stock-grants", brandId],
    enabled: !!brandId,
    queryFn: () => listBrandMerchandiseStockGrants(brandId),
  });

  const centers = useQuery({
    queryKey: ["brand-centers", brandId],
    enabled: !!brandId && needsLookups,
    queryFn: () => fetchBrandCenters(brandId),
  });

  const catalog = useQuery({
    queryKey: ["merchandise-catalog", brandId],
    enabled: !!brandId && needsLookups,
    queryFn: () => listMerchandiseCatalog(brandId),
  });

  const allItems = grants.data ?? [];
  const filteredItems = useMemo(() => filterMerchandiseStockGrants(allItems, search), [allItems, search]);

  useEffect(() => {
    if (formOpen) return;
    if (selectedId && filteredItems.some((item) => item.id === selectedId)) return;
    setSelectedId(filteredItems[0]?.id ?? null);
    setEditingId(null);
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
    setForm(emptyStockForm());
    onFormOpenChange?.(false);
  };

  const create = useMutation({
    mutationFn: async () => {
      clear();
      return grantCenterMerchandiseStock({
        brandId,
        centerId: form.centerId,
        catalogItemId: form.catalogItemId,
        quantity: stockFormQuantity(form),
        note: form.note,
      });
    },
    onSuccess: (grantId) => {
      invalidate();
      setForm(emptyStockForm());
      setSelectedId(grantId);
      onFormOpenChange?.(false);
    },
    onError: capture,
  });

  const update = useMutation({
    mutationFn: async (id: string) => {
      clear();
      await updateMerchandiseStockGrant({
        grantId: id,
        centerId: editForm.centerId,
        catalogItemId: editForm.catalogItemId,
        quantity: stockFormQuantity(editForm),
        note: editForm.note,
      });
    },
    onSuccess: () => {
      invalidate();
      grantSaved.flash();
      window.setTimeout(() => setEditingId(null), 1500);
    },
    onError: capture,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      clear();
      await deleteMerchandiseStockGrant(id);
    },
    onSuccess: (_void, id) => {
      invalidate();
      setDeleteId(null);
      setEditingId(null);
      if (selectedId === id) setSelectedId(null);
    },
    onError: capture,
  });

  const startEdit = (item: MerchandiseStockGrantRow) => {
    setEditingId(item.id);
    setEditForm(grantToForm(item));
  };

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

  const editCenterOptions =
    centerOptions.length > 0
      ? centerOptions
      : selectedItem
        ? [{ value: selectedItem.center_id, label: selectedItem.center_label }]
        : [];

  const editCatalogOptions =
    catalogOptions.length > 0
      ? catalogOptions
      : selectedItem
        ? [
            {
              value: selectedItem.catalog_item_id,
              label: `${selectedItem.catalog_name} (${selectedItem.catalog_sku})`,
            },
          ]
        : [];

  const addPanel = (
    <BrandMerchandiseAddStockPanel
      open={formOpen}
      onSubmit={() => create.mutate()}
      onClose={closeAddForm}
      submitDisabled={!isStockFormValid(form)}
      submitPending={create.isPending}
    >
      <BrandMerchandiseStockFormFields
        form={form}
        onChange={setForm}
        centerOptions={centerOptions}
        catalogOptions={catalogOptions}
      />
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
            setEditingId(null);
          }}
        />
      ))}
    </div>
  );

  const renderCard = (item: MerchandiseStockGrantRow) => (
    <BrandMerchandiseStockGrantCard
      key={item.id}
      item={item}
      editing={editingId === item.id}
      editForm={editForm}
      centerOptions={editCenterOptions}
      catalogOptions={editCatalogOptions}
      saveDisabled={!isStockFormValid(editForm)}
      savePending={update.isPending}
      saveSaved={grantSaved.saved && editingId === item.id}
      onEdit={() => startEdit(item)}
      onCancelEdit={() => setEditingId(null)}
      onSave={() => update.mutate(item.id)}
      onDelete={() => setDeleteId(item.id)}
      onEditFormChange={setEditForm}
    />
  );

  const detailPanel = formOpen ? (
    addPanel
  ) : selectedItem ? (
    <div className="ed-brand-merch-catalog">{renderCard(selectedItem)}</div>
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
            {filteredItems.map((item) => renderCard(item))}
          </div>
        </>
      )}

      <ConfirmDeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) remove.mutate(deleteId);
        }}
        title="Delete stock grant?"
        description="This removes the granted quantity from the franchise inventory on-hand total."
        confirmPending={remove.isPending}
      />
    </>
  );
}
