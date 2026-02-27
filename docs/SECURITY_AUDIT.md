# Security Audit Report — Decision OS

**Date:** 2026-03-01
**Auditor:** Automated OWASP Top 10 Review
**Scope:** Full client-side application + Supabase cloud integration
**Framework:** OWASP Top 10 (2021)

---

## Executive Summary

Decision OS demonstrates **strong security posture** for a client-side decision-support tool. The application has a lean dependency tree (7 production dependencies), comprehensive input validation with runtime type guards, strict Content-Security-Policy headers with tests, and Supabase Row-Level Security for cloud data. No critical or high vulnerabilities were identified.

**Overall Rating: Good**

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 0 |
| Medium   | 3 |
| Low      | 3 |
| Info     | 6 |

---

## 1. Injection (A03:2021)

### Scope
All user inputs: decision titles, option names, criterion names, score values, imported files, share link data.

### Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1.1 | All text inputs have `maxLength` attributes (80–500 chars) | Info | ✅ Compliant |
| 1.2 | Numeric inputs use HTML range/number constraints + `Number()` conversion | Info | ✅ Compliant |
| 1.3 | All `JSON.parse` calls wrapped in try/catch (6 call sites) | Info | ✅ Compliant |
| 1.4 | Import pipeline validates file size (1 MB), extension (.json/.csv), and schema | Info | ✅ Compliant |
| 1.5 | Input sanitization module (`sanitize.ts`) strips control chars, enforces limits | Info | ✅ Remediated |

### Details

**Input sanitization** is now applied at two trust boundaries:
- **Share link decoding** (`share.ts` → `sharePayloadToDecision`): All text fields sanitized, scores clamped to 0–10
- **File import** (`import.ts` → `importFromJson`, `csvToDecision`): Text fields sanitized on decode

The `sanitize.ts` module provides:
- `stripControlChars()`: Removes ASCII control chars, zero-width characters, BiDi overrides
- `sanitizeText()`: Single-line cleaning with length limits
- `sanitizeMultilineText()`: Multi-line cleaning with line-ending normalization
- `sanitizeNumber()`: NaN/Infinity protection with range clamping

---

## 2. Broken Authentication (A07:2021)

### Scope
Supabase authentication flow, token handling, session management.

### Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 2.1 | Supabase SDK manages token lifecycle (auto-refresh, secure storage) | Info | ✅ Compliant |
| 2.2 | OAuth via GitHub/Google — no password storage | Info | ✅ Compliant |
| 2.3 | Auth state listener properly cleaned up in `useEffect` | Info | ✅ Compliant |
| 2.4 | Cloud CRUD operations check `currentUserId()` before executing | Info | ✅ Compliant |
| 2.5 | App gracefully degrades to local-only when Supabase env vars are missing | Info | ✅ Compliant |

### Details

Authentication is entirely delegated to Supabase JS SDK with `persistSession: true` and `autoRefreshToken: true`. No custom token handling exists in the codebase. Every cloud-storage function gates on authentication state before making API calls.

---

## 3. Sensitive Data Exposure (A02:2021)

### Scope
localStorage contents, URL parameters, share links, Supabase cloud data.

### Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 3.1 | localStorage stores decision data in plaintext JSON | Medium | ⚠️ Accepted Risk |
| 3.2 | Share links encode full decision data (compressed, not encrypted) | Medium | ⚠️ Accepted Risk |
| 3.3 | Supabase RLS properly configured — users access only their own rows | Info | ✅ Compliant |
| 3.4 | Share URL fragments not sent to server in HTTP requests | Info | ✅ Compliant |
| 3.5 | Share URL length capped at 6000 characters | Info | ✅ Compliant |

### Risk Acceptance

- **3.1 — localStorage plaintext**: Decision data is not classified as sensitive PII (it contains decision titles, option names, and scores). Encryption at rest would add complexity without meaningful security benefit for this use case. Any script running on the same origin (including browser extensions) can read localStorage regardless of encryption.

- **3.2 — Share link exposure**: Share links are designed for frictionless sharing without authentication. The compressed payload is trivially decodable by anyone with the link. This is a deliberate design choice documented in ADR-001 (local-first architecture). Users should be informed that shared links expose all decision data.

---

## 4. Cross-Site Scripting / XSS (A03:2021)

### Scope
All rendered user content, share view, import modal, error boundaries.

### Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 4.1 | No `eval()`, `Function()`, or `document.write` in codebase | Info | ✅ Compliant |
| 4.2 | Single `dangerouslySetInnerHTML` in `layout.tsx` for theme detection — static literal, safe | Low | ✅ Acceptable |
| 4.3 | React JSX escapes all interpolated values by default | Info | ✅ Compliant |
| 4.4 | Error boundary now shows generic message in production (no stack leakage) | Info | ✅ Remediated |
| 4.5 | Input sanitization strips zero-width and BiDi override characters | Info | ✅ Remediated |

### Details

The single `dangerouslySetInnerHTML` usage in `layout.tsx` is a static script literal for preventing Flash of Unstyled Content (FOUC). The script reads `localStorage.getItem("decision-os:theme")` and compares it via `===` against string literals — no user input is injected into the HTML.

The `CSP script-src 'unsafe-inline'` directive is required by Next.js for hydration scripts. This is a known framework constraint, not a configuration oversight.

---

## 5. Security Misconfiguration (A05:2021)

### Scope
CSP headers, CORS, cookie flags, security headers.

### Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 5.1 | `script-src 'unsafe-inline'` weakens CSP (required by Next.js) | Medium | ⚠️ Framework Limitation |
| 5.2 | Missing `object-src 'none'` directive | Low | ✅ Remediated |
| 5.3 | Missing `base-uri 'self'` directive | Low | ✅ Remediated |
| 5.4 | Missing `form-action 'self'` directive | Low | ✅ Remediated |
| 5.5 | HSTS with 2-year max-age, includeSubDomains, preload | Info | ✅ Compliant |
| 5.6 | X-Content-Type-Options: nosniff | Info | ✅ Compliant |
| 5.7 | X-Frame-Options: SAMEORIGIN + CSP frame-ancestors 'none' | Info | ✅ Compliant |
| 5.8 | Referrer-Policy: origin-when-cross-origin | Info | ✅ Compliant |
| 5.9 | Permissions-Policy: camera=(), microphone=(), geolocation=() | Info | ✅ Compliant |

### CSP Directive Summary (Post-Remediation)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io;
font-src 'self';
worker-src 'self';
frame-ancestors 'none';
object-src 'none';
base-uri 'self';
form-action 'self'
```

### Remaining Risk

The `'unsafe-inline'` in `script-src` could be replaced with nonce-based CSP using Next.js `experimental.strictNextHead`, but this requires additional framework configuration and testing. This is tracked as a future improvement.

---

## 6. Cross-Site Request Forgery / CSRF (A01:2021)

### Scope
Supabase API calls, form submissions.

### Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 6.1 | Supabase JS SDK uses Authorization Bearer tokens (not cookies) for API calls | Info | ✅ Not Vulnerable |
| 6.2 | No custom API routes exist (Next.js App Router, client-side only) | Info | ✅ Not Applicable |
| 6.3 | `form-action 'self'` CSP directive prevents form submission to external origins | Info | ✅ Remediated |

### Details

CSRF is not a significant risk for this application because:
- Authentication tokens are sent via `Authorization` header, not cookies
- There are no server-side API routes that modify state
- The new `form-action 'self'` CSP directive provides defense-in-depth

---

## 7. Dependencies (A06:2021)

### Scope
Production and development dependency audit.

### Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 7.1 | `npm audit` reports 0 vulnerabilities | Info | ✅ Compliant |
| 7.2 | Only 7 production dependencies — minimal attack surface | Info | ✅ Compliant |
| 7.3 | All dependencies are widely-used, actively maintained packages | Info | ✅ Compliant |

### Production Dependencies

| Package | Version | Assessment |
|---------|---------|------------|
| `@sentry/nextjs` | ^10.40.0 | Trusted error reporting |
| `@supabase/supabase-js` | ^2.97.0 | Trusted BaaS SDK |
| `lucide-react` | ^0.575.0 | Icon library, no security surface |
| `lz-string` | ^1.5.0 | Pure compression, no network/DOM access |
| `next` | 16.1.6 | Core framework |
| `react` / `react-dom` | 19.2.4 | Core framework |
| `recharts` | ^3.7.0 | Charting library |

### Recommendations
- Run `npm audit` in CI pipeline (currently not failing on vulnerabilities)
- Consider pinning exact versions for production builds

---

## 8. Logging & Error Handling (A09:2021)

### Scope
Sentry configuration, error boundaries, console logging.

### Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 8.1 | Sentry `sendDefaultPii: false` — no PII in error reports | Info | ✅ Compliant |
| 8.2 | Sentry enabled only in production | Info | ✅ Compliant |
| 8.3 | Session replay disabled (`replaysSessionSampleRate: 0`) | Info | ✅ Compliant |
| 8.4 | Error boundary shows generic message in production | Info | ✅ Remediated |
| 8.5 | Error reporter stores truncated stacks (500 chars), no PII | Info | ✅ Compliant |
| 8.6 | Console logging of Supabase errors in production | Low | ⚠️ Accepted Risk |

### Details

Production console logging of Supabase errors is standard practice and only visible in browser DevTools. These errors contain API error messages (e.g., "Row not found") but no authentication tokens or user data.

---

## Remediation Summary

| Action | File(s) | Status |
|--------|---------|--------|
| Added `object-src 'none'` CSP directive | `next.config.ts` | ✅ Done |
| Added `base-uri 'self'` CSP directive | `next.config.ts` | ✅ Done |
| Added `form-action 'self'` CSP directive | `next.config.ts` | ✅ Done |
| Created input sanitization module | `src/lib/sanitize.ts` | ✅ Done |
| Sanitized share link decoded data | `src/lib/share.ts` | ✅ Done |
| Sanitized imported decision data (JSON + CSV) | `src/lib/import.ts` | ✅ Done |
| Generic error messages in production ErrorBoundary | `src/components/ErrorBoundary.tsx` | ✅ Done |
| Updated SECURITY.md with accurate practices | `SECURITY.md` | ✅ Done |

---

## Appendix: Test Coverage

Security-related tests exist in:
- `src/__tests__/csp-headers.test.ts` — CSP directive verification (9 tests)
- `src/__tests__/security.test.ts` — Input sanitization, share/import sanitization, error boundary (new)
- `src/__tests__/import.test.ts` — Import pipeline validation
- `src/__tests__/share.test.ts` — Share URL encoding/decoding

---

## Appendix: Files Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| `next.config.ts` | 74 | Security headers + CSP configuration |
| `src/lib/validation.ts` | 199 | Runtime type guards + field validators |
| `src/lib/import.ts` | 420 | File import pipeline (JSON + CSV) |
| `src/lib/share.ts` | 199 | Share URL encoding/decoding |
| `src/lib/sanitize.ts` | 83 | Input sanitization utilities (new) |
| `src/lib/storage.ts` | — | localStorage persistence |
| `src/lib/supabase.ts` | — | Supabase client singleton |
| `src/lib/error-reporter.ts` | — | Error telemetry |
| `src/lib/utils.ts` | — | General utilities (safeJsonParse) |
| `src/hooks/useAuth.ts` | — | Authentication hook |
| `src/lib/cloud-storage.ts` | — | Supabase CRUD operations |
| `src/components/ErrorBoundary.tsx` | 83 | React error boundary |
| `src/components/DecisionBuilder.tsx` | 771 | Main form inputs |
| `src/components/ImportModal.tsx` | — | Import UI |
| `src/components/ShareView.tsx` | — | Share link consumer |
| `src/app/layout.tsx` | — | Root layout (theme script) |
| `supabase/schema.sql` | — | Database schema + RLS policies |
| `sentry.client.config.ts` | — | Client-side Sentry config |
| `sentry.server.config.ts` | — | Server-side Sentry config |
