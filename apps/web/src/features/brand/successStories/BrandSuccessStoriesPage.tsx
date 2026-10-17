import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FilterTabs,
  LeadKpiCard,
  LeadKpiGrid,
  MutationError,
  PipelineDetailPanel,
  PipelinePageHeader,
  PipelineWorkspace,
} from "@edunudg/ui";
import { getSupabase } from "@/lib/supabase";
import { supabaseList } from "@/lib/supabaseResult";
import { useBrandScope } from "@/features/brand/hooks/useBrandScope";
import { useOpsBreakpoint } from "@/features/center/hooks/useOpsBreakpoint";
import { useMutationError } from "@/features/platform/hooks/useMutationError";
import { useSavedFlash } from "@/features/shared/useSavedFlash";
import { initialsFromName } from "@/lib/welcomeMessage";
import { AddSuccessStoryDialog } from "./AddSuccessStoryDialog";
import {
  SuccessStoryCard,
  type StoryForm,
  type StoryRow,
} from "./SuccessStoryCard";
import {
  filterStories,
  formatStoryListDate,
  formatStoryRelativeWhen,
  STORY_FILTER_OPTIONS,
  storyAuthorLine,
  storyCounts,
  storyStatusPresentation,
  type StoryFilter,
} from "./successStoriesHelpers";
import "@/features/brand/franchiseApplications/franchiseApplications.css";
import "./brandSuccessStories.css";

const ICON_SEARCH = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const emptyForm: StoryForm = {
  title: "",
  quote: "",
  authorName: "",
  authorRole: "",
  rating: "",
  imageUrl: "",
  sortOrder: "0",
  isPublished: true,
};

function isStoryFormValid(form: StoryForm) {
  return Boolean(form.title.trim() && form.quote.trim() && form.authorName.trim());
}

function rowToForm(story: StoryRow): StoryForm {
  return {
    title: story.title,
    quote: story.quote,
    authorName: story.author_name,
    authorRole: story.author_role ?? "",
    rating: story.rating != null ? String(story.rating) : "",
    imageUrl: story.image_url ?? "",
    sortOrder: String(story.sort_order),
    isPublished: story.is_published,
  };
}

function StatusBadge({ label, tone }: ReturnType<typeof storyStatusPresentation>) {
  return <span className={`ed-franchise-app-status-badge ed-franchise-app-status-badge--${tone}`}>{label}</span>;
}

export function BrandSuccessStoriesPage() {
  const { brandId, missingBrand } = useBrandScope();
  const qc = useQueryClient();
  const { error, clear, capture } = useMutationError();
  const storySaved = useSavedFlash();
  const { isDesktop, isMobile } = useOpsBreakpoint();
  const [filter, setFilter] = useState<StoryFilter>("published");
  const [stat, setStat] = useState<"published" | "draft" | "all">("published");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [addOpen, setAddOpen] = useState(false);

  const stories = useQuery({
    queryKey: ["brand-success-stories", brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error: qErr } = await getSupabase()
        .from("brand_success_stories")
        .select("id, title, quote, author_name, author_role, rating, image_url, sort_order, is_published, created_at")
        .eq("brand_id", brandId!)
        .order("sort_order")
        .order("created_at", { ascending: false });
      return supabaseList(data, qErr) as StoryRow[];
    },
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["brand-success-stories", brandId] });

  const update = useMutation({
    mutationFn: async (id: string) => {
      clear();
      const { error: mErr } = await getSupabase()
        .from("brand_success_stories")
        .update({
          title: editForm.title.trim(),
          quote: editForm.quote.trim(),
          author_name: editForm.authorName.trim(),
          author_role: editForm.authorRole.trim() || null,
          rating: editForm.rating ? parseInt(editForm.rating, 10) : null,
          image_url: editForm.imageUrl.trim() || null,
          sort_order: parseInt(editForm.sortOrder, 10) || 0,
          is_published: editForm.isPublished,
        })
        .eq("id", id);
      if (mErr) throw mErr;
    },
    onSuccess: () => {
      invalidate();
      storySaved.flash();
      window.setTimeout(() => setEditingId(null), 1500);
    },
    onError: capture,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      clear();
      const { error: mErr } = await getSupabase().from("brand_success_stories").delete().eq("id", id);
      if (mErr) throw mErr;
    },
    onSuccess: () => {
      if (editingId) setEditingId(null);
      setSelectedId(null);
      invalidate();
    },
    onError: capture,
  });

  const all = stories.data ?? [];
  const counts = useMemo(() => storyCounts(all), [all]);
  const filtered = useMemo(() => {
    if (stat === "all" && !search.trim()) return all;
    return filterStories(all, filter, search);
  }, [all, filter, search, stat]);
  const selected = all.find((row) => row.id === selectedId) ?? null;
  const now = Date.now();

  const closeDetail = () => {
    setSelectedId(null);
    setEditingId(null);
  };

  useEffect(() => {
    if (selectedId && !filtered.some((row) => row.id === selectedId)) {
      setSelectedId(null);
      setEditingId(null);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (selectedId || filtered.length === 0 || !isDesktop) return;
    setSelectedId(filtered[0]!.id);
  }, [filtered, selectedId, isDesktop]);

  if (missingBrand) return <p className="ed-empty">Brand context not found.</p>;

  const filterTabs = STORY_FILTER_OPTIONS.map((option) => ({
    value: option.value,
    label: isMobile ? option.mobileLabel : option.label,
    count: counts[option.value],
  }));

  const listEmpty = (
    <div className="ed-franchise-apps-page__empty">
      <p>
        {filter === "published"
          ? "No published success stories in this view."
          : "No draft success stories in this view."}
      </p>
      {filter === "published" && counts.draft > 0 ? (
        <Button variant="ghost" onClick={() => setFilter("draft")}>
          Show drafts
        </Button>
      ) : null}
    </div>
  );

  const renderDesktopList = () => {
    if (stories.isLoading) return <p className="ed-text-sm ed-muted">Loading stories…</p>;
    if (filtered.length === 0) return listEmpty;

    return (
      <div className="ed-franchise-apps-page__desktop-list">
        {filtered.map((row) => {
          const status = storyStatusPresentation(row);
          const author = storyAuthorLine(row);

          return (
            <button
              key={row.id}
              type="button"
              className={`ed-franchise-app-list-item${row.id === selectedId ? " ed-franchise-app-list-item--selected" : ""}`}
              onClick={() => {
                setSelectedId(row.id);
                setEditingId(null);
              }}
            >
              <div className="ed-franchise-app-list-item__head">
                <StatusBadge {...status} />
                <span className="ed-franchise-app-list-item__when">
                  {formatStoryRelativeWhen(row.created_at, now)}
                </span>
              </div>
              <p className="ed-franchise-app-list-item__title">{row.title}</p>
              {author ? <p className="ed-franchise-app-list-item__location">{author}</p> : null}
            </button>
          );
        })}
      </div>
    );
  };

  const renderMobileList = () => {
    if (stories.isLoading) return <p className="ed-text-sm ed-muted">Loading stories…</p>;
    if (filtered.length === 0) return listEmpty;

    return (
      <div className="ed-franchise-apps-page__mobile-list">
        {filtered.map((row) => {
          const status = storyStatusPresentation(row);
          const author = storyAuthorLine(row);
          const avatarTone = row.is_published ? "blue" : "amber";

          return (
            <button
              key={row.id}
              type="button"
              className="ed-franchise-app-mobile-card"
              onClick={() => {
                setSelectedId(row.id);
                setEditingId(null);
              }}
            >
              <div className="ed-franchise-app-mobile-card__head">
                <span className={`ed-franchise-app-mobile-card__avatar ed-franchise-app-mobile-card__avatar--${avatarTone}`}>
                  {initialsFromName(row.author_name || row.title)}
                </span>
                <div>
                  <div className="ed-franchise-app-mobile-card__title-row">
                    <h3 className="ed-franchise-app-mobile-card__title">{row.title}</h3>
                    <StatusBadge {...status} />
                  </div>
                  {author ? <p className="ed-franchise-app-mobile-card__location">{author}</p> : null}
                </div>
                <span className="ed-franchise-app-mobile-card__date">{formatStoryListDate(row.created_at)}</span>
              </div>
              <div className="ed-franchise-app-mobile-card__footer">
                <span className="ed-franchise-app-mobile-card__cta">View Details &gt;</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const editing = selected ? editingId === selected.id : false;

  return (
    <div className={`ed-franchise-apps-page ed-success-stories-page${selected ? " ed-franchise-apps-page--detail-open" : ""}`}>
      <PipelinePageHeader
        title="Success Stories"
        subtitle="Quotes you publish appear on the brand marketing site testimonials."
        actions={<Button onClick={() => setAddOpen(true)}>+ Add Story</Button>}
      />
      <MutationError message={error} />

      <LeadKpiGrid>
        <LeadKpiCard
          label="Published"
          value={counts.published}
          hint={counts.published > 0 ? "On marketing site" : undefined}
          active={stat === "published"}
          onClick={() => {
            setStat("published");
            setFilter("published");
          }}
        />
        <LeadKpiCard
          label="Draft"
          value={counts.draft}
          hint="Not published"
          active={stat === "draft"}
          onClick={() => {
            setStat("draft");
            setFilter("draft");
          }}
        />
        <LeadKpiCard label="With photo" value={counts.withPhoto} hint="Has image" />
        <LeadKpiCard
          label={isMobile ? "All stories" : "Total"}
          value={counts.all}
          hint="All stories"
          tone="total"
          active={stat === "all"}
          onClick={() => setStat("all")}
        />
      </LeadKpiGrid>

      <div className="ed-franchise-apps-page__toolbar">
        <label className="ed-franchise-apps-page__search">
          <span className="ed-franchise-apps-page__search-icon">{ICON_SEARCH}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search stories..."
            aria-label="Search stories"
          />
        </label>
        <FilterTabs
          options={filterTabs}
          value={filter}
          onChange={(next) => {
            setFilter(next);
            setStat(next === "draft" ? "draft" : "published");
          }}
          aria-label="Story filter"
        />
      </div>

      <PipelineWorkspace
        detailOpen={!!selected}
        list={
          <>
            {isDesktop ? renderDesktopList() : null}
            {isMobile ? renderMobileList() : null}
          </>
        }
        detail={
          selected && brandId ? (
            <PipelineDetailPanel title={selected.title} onBack={closeDetail}>
              <SuccessStoryCard
                story={selected}
                brandId={brandId}
                editing={editing}
                editForm={editForm}
                saveDisabled={!isStoryFormValid(editForm)}
                savePending={update.isPending}
                saveSaved={storySaved.saved && editing}
                onEdit={() => {
                  setEditingId(selected.id);
                  setEditForm(rowToForm(selected));
                }}
                onCancelEdit={() => setEditingId(null)}
                onSave={() => update.mutate(selected.id)}
                onDelete={() => remove.mutate(selected.id)}
                onEditFormChange={setEditForm}
              />
            </PipelineDetailPanel>
          ) : isDesktop ? (
            <div className="ed-franchise-apps-page__placeholder">
              <p className="ed-text-sm ed-muted">Select a success story to review quote, photo, and publish status.</p>
            </div>
          ) : null
        }
      />

      {brandId ? (
        <AddSuccessStoryDialog brandId={brandId} open={addOpen} onClose={() => setAddOpen(false)} />
      ) : null}

      {isMobile && !selected && !addOpen ? (
        <button
          type="button"
          className="ed-franchise-apps-page__fab"
          aria-label="Add Story"
          onClick={() => setAddOpen(true)}
        >
          +
        </button>
      ) : null}
    </div>
  );
}
