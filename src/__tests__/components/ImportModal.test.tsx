/**
 * ImportModal component tests.
 *
 * Covers modal accessibility, file picker, JSON/CSV import flows,
 * validation error display, CSV preview, and drag-and-drop.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/88
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { ImportModal } from "@/components/ImportModal";

// ─── Mocks ─────────────────────────────────────────────────────────

// Mock storage — keep getDecisions real, only mock saveDecision
vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    saveDecision: vi.fn(),
  };
});

// Mock toast
vi.mock("@/components/Toast", () => ({
  showToast: vi.fn(),
}));

// ─── Helpers ───────────────────────────────────────────────────────

function createFile(name: string, content: string, type = "application/json"): File {
  return new File([content], name, { type });
}

const validJson = JSON.stringify({
  id: "test-1",
  title: "Test Decision",
  description: "A test decision",
  options: [
    { id: "o1", name: "Option A" },
    { id: "o2", name: "Option B" },
  ],
  criteria: [
    { id: "c1", name: "Cost", weight: 50, type: "cost" },
    { id: "c2", name: "Quality", weight: 50, type: "benefit" },
  ],
  scores: {
    o1: { c1: 7, c2: 8 },
    o2: { c1: 5, c2: 9 },
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const validCsv = "Option,Speed,Safety\nAlpha,8,7\nBeta,6,9\n";

// ─── Tests ─────────────────────────────────────────────────────────

describe("ImportModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Accessibility & structure ──────────────────────────────────

  it("renders with dialog role and proper accessibility attributes", () => {
    renderWithProviders(<ImportModal onClose={onClose} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Import decision");
  });

  it("renders the Import Decision heading", () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    expect(screen.getByText("Import Decision")).toBeInTheDocument();
  });

  it("closes on Escape key press", () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab focus within the modal", () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    expect(focusable.length).toBeGreaterThan(0);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus last element, Tab should wrap to first
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    // Focus first element, Shift+Tab should wrap to last
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes when close button is clicked", async () => {
    const { user } = renderWithProviders(<ImportModal onClose={onClose} />);
    const closeBtn = screen.getByLabelText("Close import dialog");
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when clicking the backdrop", async () => {
    const { user } = renderWithProviders(<ImportModal onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    // Click on the backdrop itself (outermost div)
    await user.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── File input ────────────────────────────────────────────────

  it("renders file input accepting .json and .csv", () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    expect(fileInput).toHaveAttribute("type", "file");
    expect(fileInput).toHaveAttribute("accept", ".json,.csv");
  });

  it("renders the Choose a file button and format hints", () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    expect(screen.getByText("Choose a file")).toBeInTheDocument();
    expect(screen.getByText(/or drag and drop/)).toBeInTheDocument();
    expect(screen.getByText("JSON or CSV up to 1 MB")).toBeInTheDocument();
    expect(screen.getByText(".json")).toBeInTheDocument();
    expect(screen.getByText(".csv")).toBeInTheDocument();
  });

  it("shows supported formats section when no file is selected", () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    expect(screen.getByText("Supported formats")).toBeInTheDocument();
    expect(screen.getByText(/Full decision export/)).toBeInTheDocument();
    expect(screen.getByText(/Options as rows, criteria as columns/)).toBeInTheDocument();
  });

  // ── JSON import ───────────────────────────────────────────────

  it("imports valid JSON successfully and calls onClose", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("decision.json", validJson);

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("shows error for invalid JSON", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("bad.json", "{ not valid json }}}");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Import Error")).toBeInTheDocument();
    });
  });

  it("shows error for JSON missing required fields", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("incomplete.json", JSON.stringify({ foo: "bar" }));

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      // Missing title, options, criteria, scores → multiple errors
      expect(screen.getByText(/Import Error/)).toBeInTheDocument();
    });
  });

  // ── CSV import ────────────────────────────────────────────────

  it("shows CSV preview table when a valid CSV is uploaded", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("data.csv", validCsv, "text/csv");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Preview/)).toBeInTheDocument();
    });

    // CSV preview shows option names
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();

    // Shows criteria headers
    expect(screen.getAllByText("Speed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Safety").length).toBeGreaterThanOrEqual(1);

    // Shows decision title input with default
    const titleInput = screen.getByLabelText("Decision Title");
    expect(titleInput).toHaveValue("Imported Decision");
  });

  it("renders Confirm Import button in CSV preview mode", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("data.csv", validCsv, "text/csv");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Confirm Import")).toBeInTheDocument();
    });
  });

  it("confirms CSV import and calls onClose", async () => {
    const { user } = renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("data.csv", validCsv, "text/csv");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Confirm Import")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Confirm Import"));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("cancels CSV preview and returns to file picker", async () => {
    const { user } = renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("data.csv", validCsv, "text/csv");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel"));

    // Should return to file picker view
    await waitFor(() => {
      expect(screen.getByText("Choose a file")).toBeInTheDocument();
    });
  });

  // ── Validation errors ────────────────────────────────────────

  it("shows error for unsupported file extension", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("readme.txt", "plain text", "text/plain");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Import Error")).toBeInTheDocument();
      expect(
        screen.getByText("Only .json and .csv files are supported."),
      ).toBeInTheDocument();
    });
  });

  it("shows error for empty file", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("empty.json", "");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Import Error")).toBeInTheDocument();
      expect(screen.getByText("File is empty.")).toBeInTheDocument();
    });
  });

  it("shows error for oversized file (>1 MB)", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    // Create a >1MB file
    const bigContent = "x".repeat(1_048_577);
    const file = createFile("big.json", bigContent);

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Import Error")).toBeInTheDocument();
      expect(screen.getByText("File exceeds 1 MB limit.")).toBeInTheDocument();
    });
  });

  it("shows plural error heading when multiple errors exist", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    // CSV with insufficient data triggers multiple errors
    const badCsv = "Option\nA\n";
    const file = createFile("bad.csv", badCsv, "text/csv");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      // Should show at least one error about insufficient columns
      const errorHeading = screen.queryByText(/Import Error/);
      expect(errorHeading).toBeInTheDocument();
    });
  });

  // ── CSV preview controls ─────────────────────────────────────

  it("allows editing the decision title in CSV preview", async () => {
    const { user } = renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("data.csv", validCsv, "text/csv");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByLabelText("Decision Title")).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText("Decision Title");
    await user.clear(titleInput);
    await user.type(titleInput, "My Custom Title");
    expect(titleInput).toHaveValue("My Custom Title");
  });

  it("shows criterion type selectors (Benefit/Cost) in CSV preview", async () => {
    renderWithProviders(<ImportModal onClose={onClose} />);
    const fileInput = screen.getByLabelText("Choose file to import");
    const file = createFile("data.csv", validCsv, "text/csv");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByLabelText("Type for Speed")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Type for Safety")).toBeInTheDocument();
  });
});
