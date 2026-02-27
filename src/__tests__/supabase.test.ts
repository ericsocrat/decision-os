/**
 * Unit tests for Supabase client singleton.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to mock the @supabase/supabase-js module before importing supabase.ts
const mockCreateClient = vi.fn().mockReturnValue({ auth: {}, from: vi.fn() });
vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

describe("supabase", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateClient.mockClear();
    // Reset env vars
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  describe("isCloudEnabled", () => {
    it("returns false when env vars are missing", async () => {
      const { isCloudEnabled } = await import("@/lib/supabase");
      expect(isCloudEnabled()).toBe(false);
    });

    it("returns false when only URL is set", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      const { isCloudEnabled } = await import("@/lib/supabase");
      expect(isCloudEnabled()).toBe(false);
    });

    it("returns false when only anon key is set", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
      const { isCloudEnabled } = await import("@/lib/supabase");
      expect(isCloudEnabled()).toBe(false);
    });

    it("returns true when both env vars are set", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
      const { isCloudEnabled } = await import("@/lib/supabase");
      expect(isCloudEnabled()).toBe(true);
    });
  });

  describe("getSupabase", () => {
    it("returns null when env vars are missing", async () => {
      const { getSupabase } = await import("@/lib/supabase");
      expect(getSupabase()).toBeNull();
    });

    it("returns null when window is undefined (SSR)", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

      const origWindow = globalThis.window;
      // @ts-expect-error — simulating SSR environment
      delete globalThis.window;
      try {
        const { getSupabase } = await import("@/lib/supabase");
        expect(getSupabase()).toBeNull();
      } finally {
        globalThis.window = origWindow;
      }
    });

    it("creates a client singleton when env vars are set", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
      const { getSupabase } = await import("@/lib/supabase");

      const client1 = getSupabase();
      expect(client1).not.toBeNull();
      expect(mockCreateClient).toHaveBeenCalledOnce();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-key",
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          }),
        }),
      );

      // Second call returns same instance (singleton)
      const client2 = getSupabase();
      expect(client2).toBe(client1);
      expect(mockCreateClient).toHaveBeenCalledOnce();
    });
  });
});
