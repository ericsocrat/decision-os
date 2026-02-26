/**
 * Unit tests for cloud storage layer.
 *
 * Mocks the Supabase client to test CRUD operations without a real backend.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Decision } from "@/lib/types";

// ─── Mock Supabase ─────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
  isCloudEnabled: () => true,
}));

// Import AFTER mocking
const {
  cloudGetDecisions,
  cloudGetDecision,
  cloudSaveDecision,
  cloudDeleteDecision,
  cloudSaveAllDecisions,
} = await import("@/lib/cloud-storage");

// ─── Helpers ───────────────────────────────────────────────────────

const TEST_USER_ID = "user-abc-123";

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  const now = new Date().toISOString();
  return {
    id: `test-${Date.now()}`,
    title: "Test Decision",
    description: "",
    options: [
      { id: "o1", name: "A" },
      { id: "o2", name: "B" },
    ],
    criteria: [{ id: "c1", name: "Speed", weight: 50, type: "benefit" }],
    scores: { o1: { c1: 5 }, o2: { c1: 7 } },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Set up the mock to return an authenticated user. */
function mockAuthed() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: TEST_USER_ID } },
    error: null,
  });
}

/** Set up the mock to return no user. */
function mockUnauthed() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

/** Helper to build a chainable Supabase query mock. */
function chainMock(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue(finalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
  chain.upsert = vi.fn().mockResolvedValue(finalResult);
  chain.delete = vi.fn().mockReturnValue(chain);
  mockFrom.mockImplementation(handler);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ─────────────────────────────────────────────────────────

describe("cloudGetDecisions", () => {
  it("returns decisions when authenticated", async () => {
    const d = makeDecision({ id: "d1" });
    mockAuthed();
    chainMock({ data: [{ data: d }], error: null });

    const result = await cloudGetDecisions();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("returns empty array when not authenticated", async () => {
    mockUnauthed();
    const result = await cloudGetDecisions();
    expect(result).toEqual([]);
  });

  it("returns empty array on Supabase error", async () => {
    mockAuthed();
    chainMock({ data: null, error: { message: "db error" } });

    const result = await cloudGetDecisions();
    expect(result).toEqual([]);
  });

  it("filters out invalid decision objects", async () => {
    const valid = makeDecision({ id: "valid" });
    mockAuthed();
    chainMock({
      data: [{ data: valid }, { data: { notADecision: true } }, { data: null }],
      error: null,
    });

    const result = await cloudGetDecisions();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("valid");
  });
});

describe("cloudGetDecision", () => {
  it("returns a single decision", async () => {
    const d = makeDecision({ id: "single" });
    mockAuthed();
    chainMock({ data: { data: d }, error: null });

    const result = await cloudGetDecision("single");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("single");
  });

  it("returns null when not found", async () => {
    mockAuthed();
    chainMock({ data: null, error: null });

    const result = await cloudGetDecision("missing");
    expect(result).toBeNull();
  });
});

describe("cloudSaveDecision", () => {
  it("returns true on success", async () => {
    const d = makeDecision({ id: "save-me" });
    mockAuthed();
    chainMock({ data: null, error: null });

    const ok = await cloudSaveDecision(d);
    expect(ok).toBe(true);
  });

  it("returns false when not authenticated", async () => {
    mockUnauthed();
    const ok = await cloudSaveDecision(makeDecision());
    expect(ok).toBe(false);
  });

  it("returns false on Supabase error", async () => {
    const d = makeDecision();
    mockAuthed();
    chainMock({ data: null, error: { message: "constraint violation" } });

    const ok = await cloudSaveDecision(d);
    expect(ok).toBe(false);
  });
});

describe("cloudDeleteDecision", () => {
  it("returns true on success", async () => {
    mockAuthed();
    chainMock({ data: null, error: null });

    const ok = await cloudDeleteDecision("del-me");
    expect(ok).toBe(true);
  });

  it("returns false when not authenticated", async () => {
    mockUnauthed();
    const ok = await cloudDeleteDecision("del-me");
    expect(ok).toBe(false);
  });
});

describe("cloudSaveAllDecisions", () => {
  it("batch-upserts multiple decisions", async () => {
    const decisions = [makeDecision({ id: "a" }), makeDecision({ id: "b" })];
    mockAuthed();
    chainMock({ data: null, error: null });

    const ok = await cloudSaveAllDecisions(decisions);
    expect(ok).toBe(true);
  });

  it("returns false for empty array", async () => {
    mockAuthed();
    const ok = await cloudSaveAllDecisions([]);
    expect(ok).toBe(false);
  });
});
