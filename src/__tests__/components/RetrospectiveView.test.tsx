import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Decision } from "@/lib/types";
import type { JournalEntry } from "@/lib/journal";
import type { DecisionOutcome } from "@/lib/outcome-tracking";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetEntries = vi.fn<() => JournalEntry[]>(() => []);
const mockGetOutcome = vi.fn<() => DecisionOutcome | undefined>(() => undefined);
const mockGetOutcomeTimeline = vi.fn(() => []);

vi.mock("@/lib/journal", () => ({
  getEntries: (...args: unknown[]) => mockGetEntries(...(args as [])),
}));

vi.mock("@/lib/outcome-tracking", () => ({
  getOutcome: (...args: unknown[]) => mockGetOutcome(...(args as [])),
  getOutcomeTimeline: (...args: unknown[]) => mockGetOutcomeTimeline(...(args as [])),
}));

// Import component AFTER mocks
import { RetrospectiveView } from "@/components/RetrospectiveView";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "d1",
    title: "Test Decision",
    description: "A test decision",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
    ],
    criteria: [{ id: "c1", name: "Quality", weight: 100, type: "benefit" }],
    scores: {},
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "j1",
    decisionId: "d1",
    timestamp: "2024-01-02T10:00:00Z",
    type: "note",
    content: "This is a journal note about the decision.",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RetrospectiveView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEntries.mockReturnValue([]);
    mockGetOutcome.mockReturnValue(undefined);
    mockGetOutcomeTimeline.mockReturnValue([]);
  });

  it("renders empty state when no journal entries exist", () => {
    render(<RetrospectiveView decision={makeDecision()} />);

    expect(screen.getByTestId("retrospective-empty")).toBeInTheDocument();
    expect(screen.getByText("No History Yet")).toBeInTheDocument();
  });

  it("renders timeline items from journal entries", () => {
    mockGetEntries.mockReturnValue([
      makeJournalEntry({ id: "j1", content: "First note" }),
      makeJournalEntry({ id: "j2", timestamp: "2024-01-03T12:00:00Z", type: "reasoning", content: "Reasoning entry" }),
    ]);

    render(<RetrospectiveView decision={makeDecision()} />);

    // creation event + 2 journal entries = 3 timeline items
    const items = screen.getAllByTestId("timeline-item");
    expect(items.length).toBe(3);
    expect(screen.getByText("First note")).toBeInTheDocument();
    expect(screen.getByText("Reasoning entry")).toBeInTheDocument();
  });

  it("has aria-label for accessibility", () => {
    mockGetEntries.mockReturnValue([
      makeJournalEntry(),
    ]);

    render(<RetrospectiveView decision={makeDecision()} />);

    expect(screen.getByRole("region", { name: "Retrospective View" })).toBeInTheDocument();
  });

  it("shows filter controls when Filter button is clicked", async () => {
    const user = userEvent.setup();
    mockGetEntries.mockReturnValue([makeJournalEntry()]);

    render(<RetrospectiveView decision={makeDecision()} />);

    // Filters should not be visible initially
    expect(screen.queryByTestId("event-filters")).not.toBeInTheDocument();

    // Click filter button
    await user.click(screen.getByRole("button", { name: "Toggle filters" }));

    // Now filters should be visible
    expect(screen.getByTestId("event-filters")).toBeInTheDocument();
  });

  it("filters timeline items by event type", async () => {
    const user = userEvent.setup();
    mockGetEntries.mockReturnValue([
      makeJournalEntry({ id: "j1", type: "note", content: "Note content" }),
      makeJournalEntry({ id: "j2", timestamp: "2024-01-03T00:00:00Z", type: "reasoning", content: "Reasoning content" }),
    ]);

    render(<RetrospectiveView decision={makeDecision()} />);

    // Initially 3 items (creation + note + reasoning)
    expect(screen.getAllByTestId("timeline-item")).toHaveLength(3);

    // Open filters
    await user.click(screen.getByRole("button", { name: "Toggle filters" }));

    // Click the "Note" filter to deactivate it
    const noteButton = screen.getByRole("button", { name: "Note" });
    await user.click(noteButton);

    // Now should have 2 items (creation + reasoning)
    expect(screen.getAllByTestId("timeline-item")).toHaveLength(2);
    expect(screen.queryByText("Note content")).not.toBeInTheDocument();
  });

  it("expands and collapses long entries", async () => {
    const user = userEvent.setup();
    const longContent = "A".repeat(200);
    mockGetEntries.mockReturnValue([
      makeJournalEntry({ id: "j1", content: longContent }),
    ]);

    render(<RetrospectiveView decision={makeDecision()} />);

    // Should show "Show more" for long content
    expect(screen.getByText("Show more")).toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByRole("button", { name: "Expand entry" }));

    // Should now show "Show less"
    expect(screen.getByText("Show less")).toBeInTheDocument();

    // Click to collapse
    await user.click(screen.getByRole("button", { name: "Collapse entry" }));

    // Back to "Show more"
    expect(screen.getByText("Show more")).toBeInTheDocument();
  });

  it("displays metadata badges for journal entries with metadata", () => {
    mockGetEntries.mockReturnValue([
      makeJournalEntry({
        id: "j1",
        content: "Entry with mood",
        metadata: { mood: "confident", timeSpent: 30 },
      }),
    ]);

    render(<RetrospectiveView decision={makeDecision()} />);

    expect(screen.getByText("confident")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
  });

  it("has an export markdown button", () => {
    mockGetEntries.mockReturnValue([makeJournalEntry()]);

    render(<RetrospectiveView decision={makeDecision()} />);

    expect(screen.getByRole("button", { name: "Export as markdown" })).toBeInTheDocument();
  });

  it("shows event count summary", () => {
    mockGetEntries.mockReturnValue([
      makeJournalEntry({ id: "j1" }),
      makeJournalEntry({ id: "j2", timestamp: "2024-01-04T00:00:00Z", type: "outcome", content: "Outcome" }),
    ]);

    render(<RetrospectiveView decision={makeDecision()} />);

    // 3 events shown (creation + 2 entries)
    expect(screen.getByText("3 events shown")).toBeInTheDocument();
  });

  it("renders the Decision Retrospective heading", () => {
    mockGetEntries.mockReturnValue([makeJournalEntry()]);

    render(<RetrospectiveView decision={makeDecision()} />);

    expect(screen.getByText("Decision Retrospective")).toBeInTheDocument();
  });
});
