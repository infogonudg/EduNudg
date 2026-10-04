import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  DataList,
  DirectoryPagination,
  Input,
  ListRow,
  MutationError,
  SaveButton,
} from "@edunudg/ui";
import {
  brandDetailPaginationSummary,
  paginateBrandDetailList,
  shouldPaginateBrandDetailList,
} from "@/lib/brandDetailLists";
import {
  deleteBrandDomainMapping,
  isRemovableBrandDomain,
  partitionBrandDomainMappings,
  upsertBrandDomainMapping,
  type BrandDomainMappingRow,
} from "@/lib/brandDomainMappingApi";
import { portalTargetFromDomain } from "@/lib/brandPortalUrl";
import { useMutationError } from "@/features/platform/hooks/useMutationError";
import { ConfirmDeleteDialog } from "@/features/shared/ConfirmDeleteDialog";
import { PortalOpenButton } from "./PortalOpenButton";
import "./brandDetailPage.css";

type Props = {
  brandId: string;
  brandSlug: string;
  domains: BrandDomainMappingRow[];
  domainsPage: number;
  onDomainsPageChange: (page: number) => void;
};

function DomainRows({
  brandSlug,
  items,
  onEdit,
  onRequestRemove,
}: {
  brandSlug: string;
  items: Array<BrandDomainMappingRow & { id: string }>;
  onEdit: (row: BrandDomainMappingRow) => void;
  onRequestRemove: (hostname: string) => void;
}) {
  return (
    <DataList
      items={items}
      empty="No domains in this list."
      render={(d) => {
        const target = portalTargetFromDomain(d.portal_type, d.hostname, brandSlug);
        const removable = isRemovableBrandDomain(d);
        return (
          <ListRow
            aside={
              <div className="ed-brand-domains__row-actions">
                {target ? <PortalOpenButton target={target} /> : null}
                {removable ? (
                  <>
                    <Button type="button" variant="ghost" onClick={() => onEdit(d)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => onRequestRemove(d.hostname)}>
                      Remove
                    </Button>
                  </>
                ) : null}
              </div>
            }
          >
            <div className="ed-brand-domains__row-main">
              <code className="ed-brand-domains__host">{d.hostname}</code>
              <span className="ed-brand-domains__badges">
                <Badge tone={d.portal_type === "brand" ? "success" : "default"}>{d.portal_type}</Badge>
                {d.is_primary ? <Badge tone="warning">primary</Badge> : null}
              </span>
            </div>
          </ListRow>
        );
      }}
    />
  );
}

export function BrandDomainsCard({
  brandId,
  brandSlug,
  domains,
  domainsPage,
  onDomainsPageChange,
}: Props) {
  const qc = useQueryClient();
  const { error, clear, capture } = useMutationError();
  const [hostname, setHostname] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [editingOriginalHost, setEditingOriginalHost] = useState<string | null>(null);
  const [lastSavedHost, setLastSavedHost] = useState<string | null>(null);
  const [pendingRemoveHost, setPendingRemoveHost] = useState<string | null>(null);
  const [showLocal, setShowLocal] = useState(false);

  const { custom, local } = useMemo(() => partitionBrandDomainMappings(domains), [domains]);
  const customList = paginateBrandDetailList(custom, domainsPage);
  const isEditing = Boolean(editingOriginalHost);

  const save = useMutation({
    mutationFn: async () => {
      const row = await upsertBrandDomainMapping({
        brandId,
        hostname,
        isPrimary,
      });
      const nextHost = row.hostname;
      const previous = editingOriginalHost?.trim().toLowerCase() ?? null;
      if (previous && previous !== nextHost) {
        await deleteBrandDomainMapping({ brandId, hostname: previous });
      }
      return row;
    },
    onMutate: clear,
    onSuccess: (row) => {
      setHostname("");
      setIsPrimary(false);
      setEditingOriginalHost(null);
      setLastSavedHost(row.hostname);
      void qc.invalidateQueries({ queryKey: ["brand-domains", brandId] });
    },
    onError: capture,
  });

  const remove = useMutation({
    mutationFn: (host: string) => deleteBrandDomainMapping({ brandId, hostname: host }),
    onMutate: clear,
    onSuccess: (_void, host) => {
      setPendingRemoveHost(null);
      setLastSavedHost(null);
      if (editingOriginalHost === host) {
        setHostname("");
        setIsPrimary(false);
        setEditingOriginalHost(null);
      }
      void qc.invalidateQueries({ queryKey: ["brand-domains", brandId] });
    },
    onError: capture,
  });

  return (
    <Card title="Domains">
      <p className="ed-text-sm ed-muted ed-brand-domains__intro">
        Link a purchased hostname to this brand. Existing custom domains are listed below. After
        saving a new one, attach it in Vercel and point DNS at your registrar. Use{" "}
        <strong>Edit</strong> to change hostname or primary; <strong>Remove</strong> asks for
        confirmation first.
      </p>

      <div className="ed-brand-domains__form">
        <div className="ed-brand-domains__hostname">
          <Input
            label={isEditing ? "Hostname (editing)" : "Hostname"}
            value={hostname}
            onChange={setHostname}
            placeholder="www.example.com"
            editable
          />
        </div>
        <label className="ed-brand-domains__primary">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          <span>Primary</span>
        </label>
        <div className="ed-brand-domains__add">
          <SaveButton
            onClick={() => save.mutate()}
            disabled={!hostname.trim() || save.isPending}
            pending={save.isPending}
            label={isEditing ? "Save domain" : "Add domain"}
          />
        </div>
      </div>
      {isEditing ? (
        <p className="ed-text-sm ed-muted ed-brand-domains__edit-hint">
          Editing <code>{editingOriginalHost}</code>. Change the hostname or primary, then save — or{" "}
          <button
            type="button"
            className="ed-brand-domains__cancel-edit"
            onClick={() => {
              setHostname("");
              setIsPrimary(false);
              setEditingOriginalHost(null);
            }}
          >
            Cancel edit
          </button>
          .
        </p>
      ) : null}

      <MutationError message={error} />

      {lastSavedHost ? (
        <div className="ed-brand-domains__saved" role="status">
          <p className="ed-brand-domains__saved-title">
            Mapping saved for {lastSavedHost}. Finish outside EduNudg:
          </p>
          <ol className="ed-brand-domains__saved-steps">
            <li>
              <strong>Vercel</strong> → Project → Settings → Domains → Add{" "}
              <code>{lastSavedHost}</code> (wait until it shows the DNS records to copy).
            </li>
            <li>
              <strong>GoDaddy / registrar</strong> → DNS → add the A / CNAME (and TXT if shown)
              exactly as Vercel lists for that hostname.
            </li>
            <li>
              Back in Vercel, wait until the domain is <strong>Valid</strong>, then open{" "}
              <code>https://{lastSavedHost}/</code> — EduNudg routing is already linked.
            </li>
          </ol>
        </div>
      ) : null}

      <section className="ed-brand-domains__section" aria-labelledby="ed-brand-domains-custom-heading">
        <div className="ed-brand-domains__section-head">
          <h3 id="ed-brand-domains-custom-heading" className="ed-brand-domains__section-title">
            Existing custom domains
          </h3>
          <span className="ed-text-sm ed-muted">{custom.length}</span>
        </div>
        {custom.length === 0 ? (
          <p className="ed-text-sm ed-muted ed-brand-domains__empty">
            No purchased hostnames yet. Add one above (e.g. www.smartbraineducations.com).
          </p>
        ) : (
          <DomainRows
            brandSlug={brandSlug}
            items={customList.items.map((d, i) => ({ ...d, id: `custom-${d.hostname}-${i}` }))}
            onEdit={(row) => {
              setHostname(row.hostname);
              setIsPrimary(row.is_primary);
              setEditingOriginalHost(row.hostname);
              setLastSavedHost(null);
              clear();
            }}
            onRequestRemove={setPendingRemoveHost}
          />
        )}
        {shouldPaginateBrandDetailList(customList.total) ? (
          <DirectoryPagination
            aria-label="Domains pagination"
            summary={brandDetailPaginationSummary(customList, "No domains")}
            onPrevious={() => onDomainsPageChange(Math.max(1, domainsPage - 1))}
            onNext={() => onDomainsPageChange(Math.min(customList.pageCount, domainsPage + 1))}
            disablePrevious={customList.page <= 1}
            disableNext={customList.page >= customList.pageCount}
          />
        ) : null}
      </section>

      {local.length > 0 ? (
        <section className="ed-brand-domains__section ed-brand-domains__section--local">
          <button
            type="button"
            className="ed-brand-domains__local-toggle"
            aria-expanded={showLocal}
            onClick={() => setShowLocal((open) => !open)}
          >
            <span>
              Local / seed hostnames <span className="ed-muted">({local.length})</span>
            </span>
            <span className="ed-brand-domains__local-chevron" aria-hidden>
              {showLocal ? "▴" : "▾"}
            </span>
          </button>
          {showLocal ? (
            <DomainRows
              brandSlug={brandSlug}
              items={local.map((d, i) => ({ ...d, id: `local-${d.hostname}-${i}` }))}
              onEdit={(row) => {
                setHostname(row.hostname);
                setIsPrimary(row.is_primary);
                setEditingOriginalHost(row.hostname);
                setLastSavedHost(null);
                clear();
              }}
              onRequestRemove={setPendingRemoveHost}
            />
          ) : (
            <p className="ed-text-sm ed-muted ed-brand-domains__empty">
              Hidden by default — localhost rows used for local Vite hosts.
            </p>
          )}
        </section>
      ) : null}

      <ConfirmDeleteDialog
        open={pendingRemoveHost != null}
        onClose={() => setPendingRemoveHost(null)}
        onConfirm={() => {
          if (pendingRemoveHost) remove.mutate(pendingRemoveHost);
        }}
        title="Remove this domain mapping?"
        description={
          pendingRemoveHost
            ? `This removes ${pendingRemoveHost} from EduNudg routing only. Visitors to that host will stop resolving to this brand until you map it again. Vercel/DNS are not changed.`
            : undefined
        }
        confirmPending={remove.isPending}
      />
    </Card>
  );
}
