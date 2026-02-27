/**
 * Tests for SyncStatus component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SyncStatus } from "@/components/SyncStatus";
import type { UseSyncReturn } from "@/hooks/useSync";

/* ---------- mocks ---------- */
const mockIsCloudEnabled = vi.fn(() => true);
vi.mock("@/lib/supabase", () => ({
  isCloudEnabled: () => mockIsCloudEnabled(),
}));

function makeSyncProp(overrides: Partial<UseSyncReturn> = {}): UseSyncReturn {
  return {
    status: "idle",
    lastResult: null,
    triggerSync: vi.fn(),
    isSyncing: false,
    ...overrides,
  };
}

describe("SyncStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCloudEnabled.mockReturnValue(true);
  });

  it("returns null when cloud is not enabled", () => {
    mockIsCloudEnabled.mockReturnValue(false);
    const { container } = render(
      <SyncStatus sync={makeSyncProp()} isAuthenticated={true} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when not authenticated", () => {
    const { container } = render(
      <SyncStatus sync={makeSyncProp()} isAuthenticated={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows idle status label", () => {
    render(<SyncStatus sync={makeSyncProp({ status: "idle" })} isAuthenticated={true} />);
    expect(screen.getByLabelText("Cloud sync ready")).toBeInTheDocument();
  });

  it("shows syncing state", () => {
    render(
      <SyncStatus
        sync={makeSyncProp({ status: "syncing", isSyncing: true })}
        isAuthenticated={true}
      />,
    );
    expect(screen.getByLabelText("Syncing…")).toBeInTheDocument();
  });

  it("shows done status", () => {
    render(
      <SyncStatus
        sync={makeSyncProp({
          status: "done",
          lastResult: { status: "done" as const, uploaded: 2, downloaded: 1, merged: 0 },
        })}
        isAuthenticated={true}
      />,
    );
    expect(screen.getByText("Synced")).toBeInTheDocument();
  });

  it("shows error with retry button", () => {
    render(
      <SyncStatus
        sync={makeSyncProp({ status: "error" })}
        isAuthenticated={true}
      />,
    );
    expect(screen.getByLabelText("Retry sync")).toBeInTheDocument();
    expect(screen.getByLabelText("Sync error")).toBeInTheDocument();
  });

  it("calls triggerSync on button click", async () => {
    const triggerSync = vi.fn();
    const user = userEvent.setup();
    render(
      <SyncStatus
        sync={makeSyncProp({ status: "idle", triggerSync })}
        isAuthenticated={true}
      />,
    );
    await user.click(screen.getByLabelText("Cloud sync ready"));
    expect(triggerSync).toHaveBeenCalled();
  });

  it("shows tooltip with upload/download counts when lastResult exists", () => {
    render(
      <SyncStatus
        sync={makeSyncProp({
          status: "done",
          lastResult: { status: "done" as const, uploaded: 3, downloaded: 5, merged: 0 },
        })}
        isAuthenticated={true}
      />,
    );
    const btn = screen.getByLabelText(/Synced — ↑3 ↓5/);
    expect(btn).toBeInTheDocument();
  });

  it("shows offline status", () => {
    render(
      <SyncStatus
        sync={makeSyncProp({ status: "offline" })}
        isAuthenticated={true}
      />,
    );
    expect(screen.getByLabelText("Offline")).toBeInTheDocument();
  });
});
