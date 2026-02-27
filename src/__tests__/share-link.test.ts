/**
 * Unit tests for server-stored shareable decision links.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/244
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Decision } from "@/lib/types";

// ─── Mock Supabase ─────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
  isCloudEnabled: () => true,
}));

// Import AFTER mocking
const {
  generateShortId,
  createSharedLink,
  fetchSharedDecision,
  buildServerShareUrl,
} = await import("@/lib/share-link");

import { getSupabase } from "@/lib/supabase";

// ─── Helpers ───────────────────────────────────────────────────────

const TEST_USER_ID = "user-share-123";

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  const now = new Date().toISOString();
  return {
    id: "test-share-1",
    title: "Test Decision",
    description: "A test decision for sharing",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
    ],
    criteria: [{ id: "c1", name: "Quality", weight: 50, type: "benefit" }],
    scores: { o1: { c1: 7 }, o2: { c1: 5 } },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function mockAuthed() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: TEST_USER_ID } },
    error: null,
  });
}

function mockUnauthed() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

/** Build a chainable Supabase query mock. */
function chainMock(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(finalResult);
  // Insert returns the final result directly
  chain.insert = vi.fn().mockResolvedValue(finalResult);
  return { chain, handler };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("generateShortId", () => {
  it("generates an 8-character alphanumeric string", () => {
    const id = generateShortId();
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[A-Za-z0-9]{8}$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateShortId()));
    expect(ids.size).toBe(100);
  });
});

describe("createSharedLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when Supabase is not available", async () => {
    vi.mocked(getSupabase).mockReturnValueOnce(null);
    const result = await createSharedLink(makeDecision());
    expect(result).toBeNull();
  });

  it("returns null when user is not authenticated", async () => {
    mockUnauthed();
    const result = await createSharedLink(makeDecision());
    expect(result).toBeNull();
  });

  it("stores decision and returns short ID on success", async () => {
    mockAuthed();
    const { chain } = chainMock({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createSharedLink(makeDecision());

    expect(result).toBeTruthy();
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(mockFrom).toHaveBeenCalledWith("shared_decisions");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result,
        created_by: TEST_USER_ID,
        decision: expect.objectContaining({ title: "Test Decision" }),
      }),
    );
  });

  it("returns null and logs error on insert failure", async () => {
    mockAuthed();
    const { chain } = chainMock({ data: null, error: { message: "insert failed" } });
    mockFrom.mockReturnValue(chain);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await createSharedLink(makeDecision());

    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      "[DecisionOS:share] Failed to create shared link:",
      "insert failed",
    );
    spy.mockRestore();
  });

  it("returns null on unexpected exception", async () => {
    mockGetUser.mockRejectedValue(new Error("network error"));

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await createSharedLink(makeDecision());

    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      "[DecisionOS:share] Unexpected error creating shared link:",
      expect.any(Error),
    );
    spy.mockRestore();
  });
});

describe("fetchSharedDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when Supabase is not available", async () => {
    vi.mocked(getSupabase).mockReturnValueOnce(null);
    const result = await fetchSharedDecision("abc12345");
    expect(result).toBeNull();
  });

  it("returns null for empty short ID", async () => {
    const result = await fetchSharedDecision("");
    expect(result).toBeNull();
  });

  it("returns null for invalid short ID format", async () => {
    const result = await fetchSharedDecision("abc!@#$%");
    expect(result).toBeNull();
  });

  it("fetches and returns a valid shared decision", async () => {
    const decision = makeDecision();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const { chain } = chainMock({
      data: { decision, expires_at: futureDate },
      error: null,
    });
    // Set up the select → eq → single chain properly
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({
      data: { decision, expires_at: futureDate },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await fetchSharedDecision("abc12345");

    expect(result).toEqual(decision);
    expect(mockFrom).toHaveBeenCalledWith("shared_decisions");
    expect(chain.select).toHaveBeenCalledWith("decision, expires_at");
    expect(chain.eq).toHaveBeenCalledWith("id", "abc12345");
  });

  it("returns null when decision is not found", async () => {
    const { chain } = chainMock({ data: null, error: { message: "not found" } });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });
    mockFrom.mockReturnValue(chain);

    const result = await fetchSharedDecision("notfound");
    expect(result).toBeNull();
  });

  it("returns null for expired shared decision", async () => {
    const decision = makeDecision();
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const { chain } = chainMock({
      data: { decision, expires_at: pastDate },
      error: null,
    });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({
      data: { decision, expires_at: pastDate },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await fetchSharedDecision("expired1");
    expect(result).toBeNull();
  });

  it("returns null for invalid decision data", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const { chain } = chainMock({
      data: { decision: { invalid: true }, expires_at: futureDate },
      error: null,
    });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({
      data: { decision: { invalid: true }, expires_at: futureDate },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await fetchSharedDecision("invalid1");
    expect(result).toBeNull();
  });

  it("returns null and logs error on exception", async () => {
    const { chain } = chainMock({ data: null, error: null });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockRejectedValue(new Error("network failure"));
    mockFrom.mockReturnValue(chain);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await fetchSharedDecision("err12345");

    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      "[DecisionOS:share] Failed to fetch shared decision:",
      expect.any(Error),
    );
    spy.mockRestore();
  });
});

describe("buildServerShareUrl", () => {
  it("builds correct URL from short ID and origin", () => {
    const url = buildServerShareUrl("X7kq2mPn", "https://decision-os.vercel.app");
    expect(url).toBe("https://decision-os.vercel.app/share?id=X7kq2mPn");
  });

  it("works with localhost origin", () => {
    const url = buildServerShareUrl("abc12345", "http://localhost:3000");
    expect(url).toBe("http://localhost:3000/share?id=abc12345");
  });
});
