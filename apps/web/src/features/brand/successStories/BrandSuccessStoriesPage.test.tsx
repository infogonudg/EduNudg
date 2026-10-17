import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrandSuccessStoriesPage } from "./BrandSuccessStoriesPage";

const { mockStories } = vi.hoisted(() => ({
  mockStories: [] as Record<string, unknown>[],
}));

vi.mock("@/features/brand/hooks/useBrandScope", () => ({
  useBrandScope: () => ({ brandId: "brand-1", brandSlug: "abacusworld", isLoading: false, missingBrand: false }),
}));

vi.mock("./AddSuccessStoryDialog", () => ({
  AddSuccessStoryDialog: ({ open }: { open: boolean }) =>
    open ? <div>Add success story dialog</div> : null,
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
          Promise.resolve({ data: mockStories, error: null }).then(resolve),
      };
      return chain;
    },
  }),
}));

const publishedStory = {
  id: "story-1",
  title: "Riya topped the olympiad",
  quote: "The center changed how my daughter sees maths.",
  author_name: "Asha Rao",
  author_role: "Parent",
  rating: 5,
  image_url: "https://cdn.example/riya.jpg",
  sort_order: 1,
  is_published: true,
  created_at: "2026-08-01T10:00:00Z",
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <BrandSuccessStoriesPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("BrandSuccessStoriesPage", () => {
  beforeEach(() => {
    mockStories.splice(0, mockStories.length, publishedStory);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("1024"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("regression_renders_without_useAddFormCloser_reference_error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage();

    expect(await screen.findByRole("button", { name: "+ Add Story" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Success Stories" })).toBeDefined();
    expect(screen.getByText(/appear on the brand marketing site testimonials/i)).toBeDefined();
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("useAddFormCloser is not defined")
    );
    consoleError.mockRestore();
  });

  it("regression_success_stories_kpi_cards_match_pipeline_stats", async () => {
    mockStories.splice(
      0,
      mockStories.length,
      publishedStory,
      { ...publishedStory, id: "story-2", title: "Draft center story", is_published: false, image_url: null },
      { ...publishedStory, id: "story-3", title: "Published no photo", image_url: "" }
    );

    const { container } = renderPage();
    expect(await screen.findByRole("tab", { name: /Published \(2\)/ })).toBeDefined();

    const kpiLabels = [...container.querySelectorAll(".ed-lead-kpi__label")].map((el) => el.textContent);
    expect(kpiLabels).toEqual(["Published", "Draft", "With photo", "Total"]);
    const kpiValues = [...container.querySelectorAll(".ed-lead-kpi__value")].map((el) => el.textContent);
    expect(kpiValues).toEqual(["2", "1", "1", "3"]);

    fireEvent.click(container.querySelectorAll(".ed-lead-kpi")[1]!);
    expect(screen.getByRole("tab", { name: /Draft \(1\)/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("regression_success_stories_total_kpi_does_not_highlight_published", async () => {
    mockStories.splice(0, mockStories.length, publishedStory);
    const { container } = renderPage();
    await screen.findByRole("tab", { name: /Published/ });
    const cards = container.querySelectorAll(".ed-lead-kpi");
    expect(cards[0]!.classList.contains("is-active")).toBe(true);
    fireEvent.click(cards[3]!);
    expect(cards[3]!.classList.contains("is-active")).toBe(true);
    expect(cards[0]!.classList.contains("is-active")).toBe(false);
  });

  it("regression_success_stories_pipeline_list_with_filter_tabs", async () => {
    renderPage();
    expect(await screen.findByRole("tablist", { name: "Story filter" })).toBeDefined();
    expect(await screen.findByRole("tab", { name: /Published \(1\)/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Draft \(0\)/ })).toBeDefined();
    expect(screen.getByPlaceholderText("Search stories...")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Riya topped the olympiad", level: 2 })).toBeDefined();
    expect(screen.getByText(/center changed how my daughter sees maths/)).toBeDefined();
  });

  it("regression_add_story_opens_modal_instead_of_below_fold_form", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Success Stories" })).toBeDefined();
    expect(screen.queryByText("Add success story dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Add Story" }));
    expect(screen.getByText("Add success story dialog")).toBeDefined();
  });
});
