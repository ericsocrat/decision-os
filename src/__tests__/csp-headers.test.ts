/**
 * Unit tests verifying Content-Security-Policy header configuration.
 *
 * We dynamically import next.config.ts and call its `headers()` fn to
 * assert the CSP directives are present and well-formed.
 */
import { describe, it, expect, beforeAll } from "vitest";

let securityHeaders: Array<{ key: string; value: string }>;

describe("Content-Security-Policy header", () => {
  // Extract headers from the Next config at runtime
  beforeAll(async () => {
    // next.config.ts default-exports a NextConfig object with an async headers() method
    const mod = await import("../../next.config");
    const config = mod.default;
    const headerSets = await config.headers!();
    // The config returns [{ source: "/(.*)", headers: [...] }]
    securityHeaders = headerSets[0].headers as Array<{
      key: string;
      value: string;
    }>;
  });

  it("includes a Content-Security-Policy header", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy");
    expect(csp).toBeDefined();
  });

  it("sets default-src to self", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!;
    expect(csp.value).toContain("default-src 'self'");
  });

  it("allows unsafe-inline scripts for Next.js hydration", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!;
    expect(csp.value).toContain("script-src 'self' 'unsafe-inline'");
  });

  it("allows unsafe-inline styles for Tailwind", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!;
    expect(csp.value).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("allows data: and blob: images", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!;
    expect(csp.value).toContain("img-src 'self' data: blob:");
  });

  it("allows Supabase connections", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!;
    expect(csp.value).toContain("connect-src 'self' https://*.supabase.co");
  });

  it("blocks framing via frame-ancestors none", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!;
    expect(csp.value).toContain("frame-ancestors 'none'");
  });

  it("restricts font-src to self", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!;
    expect(csp.value).toContain("font-src 'self'");
  });

  it("restricts worker-src to self for service worker", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!;
    expect(csp.value).toContain("worker-src 'self'");
  });

  it("still includes all original security headers", () => {
    const keys = securityHeaders.map((h) => h.key);
    expect(keys).toContain("Strict-Transport-Security");
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Permissions-Policy");
    expect(keys).toContain("X-DNS-Prefetch-Control");
  });
});
