/**
 * Tests for MigrationBanner component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MigrationBanner } from "@/components/MigrationBanner";

/* ---------- mocks ---------- */
const mockIsCloudEnabled = vi.fn(() => true);
const mockHasMigrated = vi.fn(() => false);
const mockGetDecisions = vi.fn(() => [
  { id: "d1", title: "Decision A", options: [], criteria: [], scores: {} },
  { id: "d2", title: "Decision B", options: [], criteria: [], scores: {} },
]);
const mockCloudSaveAll = vi.fn(async () => true);

vi.mock("@/lib/supabase", () => ({
  isCloudEnabled: () => mockIsCloudEnabled(),
}));

vi.mock("@/lib/sync", () => ({
  hasMigrated: () => mockHasMigrated(),
}));

vi.mock("@/lib/storage", () => ({
  getDecisions: () => mockGetDecisions(),
}));

vi.mock("@/lib/cloud-storage", () => ({
  cloudSaveAllDecisions: () => mockCloudSaveAll(),
}));

describe("MigrationBanner", () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCloudEnabled.mockReturnValue(true);
    mockHasMigrated.mockReturnValue(false);
    mockGetDecisions.mockReturnValue([
      { id: "d1", title: "A", options: [], criteria: [], scores: {} },
      { id: "d2", title: "B", options: [], criteria: [], scores: {} },
    ]);
    mockCloudSaveAll.mockResolvedValue(true);
    localStorage.clear();
  });

  it("returns null when cloud is not enabled", () => {
    mockIsCloudEnabled.mockReturnValue(false);
    const { container } = render(
      <MigrationBanner isAuthenticated={true} onComplete={onComplete} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when user is not authenticated", () => {
    const { container } = render(
      <MigrationBanner isAuthenticated={false} onComplete={onComplete} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when already migrated", () => {
    mockHasMigrated.mockReturnValue(true);
    const { container } = render(
      <MigrationBanner isAuthenticated={true} onComplete={onComplete} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when no local decisions exist", () => {
    mockGetDecisions.mockReturnValue([]);
    const { container } = render(
      <MigrationBanner isAuthenticated={true} onComplete={onComplete} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows the banner with local decision count", () => {
    render(<MigrationBanner isAuthenticated={true} onComplete={onComplete} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/decisions saved locally/i)).toBeInTheDocument();
    expect(screen.getByText("Upload Now")).toBeInTheDocument();
  });

  it("calls cloudSaveAllDecisions and onComplete on upload", async () => {
    const user = userEvent.setup();
    render(<MigrationBanner isAuthenticated={true} onComplete={onComplete} />);
    await user.click(screen.getByText("Upload Now"));

    await waitFor(() => {
      expect(mockCloudSaveAll).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it("shows error message when migration fails", async () => {
    mockCloudSaveAll.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<MigrationBanner isAuthenticated={true} onComplete={onComplete} />);
    await user.click(screen.getByText("Upload Now"));

    await waitFor(() => {
      expect(screen.getByText("Migration failed. Please try again.")).toBeInTheDocument();
    });
  });

  it("shows error message on exception", async () => {
    mockCloudSaveAll.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(<MigrationBanner isAuthenticated={true} onComplete={onComplete} />);
    await user.click(screen.getByText("Upload Now"));

    await waitFor(() => {
      expect(screen.getByText("Migration failed. Please try again.")).toBeInTheDocument();
    });
  });

  it("dismisses the banner when X button is clicked", async () => {
    const user = userEvent.setup();
    render(<MigrationBanner isAuthenticated={true} onComplete={onComplete} />);
    expect(screen.getByText("Upload Now")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Dismiss migration banner"));
    expect(screen.queryByText("Upload Now")).not.toBeInTheDocument();
  });
});
