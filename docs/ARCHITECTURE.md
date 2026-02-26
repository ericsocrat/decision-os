# Architecture

## Overview

Decision OS is a client-side web application built with Next.js (App Router) and TypeScript. It uses a local-first architecture — all data lives in the browser's localStorage by default, with optional Supabase-powered cloud sync for cross-device access.

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                     │
│                                                         │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Decision      │  │ Results      │  │ Sensitivity  │ │
│  │ Builder UI    │  │ View         │  │ Analysis     │ │
│  └──────┬────────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│  ┌──────▼──────────────────▼──────────────────▼───────┐ │
│  │           DecisionProvider (React Context)         │ │
│  │         State management + auto-save               │ │
│  └──────┬─────────────────────────────┬───────────────┘ │
│         │                             │                 │
│  ┌──────▼──────────┐  ┌──────────────▼───────────────┐ │
│  │ Scoring Engine  │  │ Storage Layer (localStorage) │ │
│  │ (Pure functions)│  │                              │ │
│  └─────────────────┘  └──────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Module Boundaries

### `/src/lib/` — Core Logic (Pure, testable, no React)

| File                | Responsibility                                                        |
| ------------------- | --------------------------------------------------------------------- |
| `types.ts`          | TypeScript type definitions for the entire domain                     |
| `scoring.ts`        | Deterministic scoring engine (weighted sum, sensitivity analysis)     |
| `validation.ts`     | Input validation with structured error messages + runtime type guards |
| `storage.ts`        | localStorage CRUD operations                                          |
| `cloud-storage.ts`  | Supabase cloud CRUD operations (guarded, returns empty when offline)  |
| `sync.ts`           | Bidirectional sync engine (local ↔ cloud, last-write-wins)            |
| `supabase.ts`       | Supabase client singleton with feature-flag guard                     |
| `supabase-types.ts` | Generated Supabase Database types for the decisions table             |
| `demo-data.ts`      | Preloaded demo decision                                               |
| `utils.ts`          | Utilities (ID generation, URL encoding/decoding, relative time)       |
| `templates.ts`      | 8 pre-built decision templates with `instantiateTemplate()` factory   |
| `import.ts`         | JSON/CSV import parsing, preview, validation, and file reading        |
| `comparison.ts`     | Decision comparison engine (deltas, agreement score, heatmap)         |
| `monte-carlo.ts`    | Monte Carlo simulation engine (PRNG, perturbation, distributions)     |
| `share.ts`          | Compact share encoding/decoding (short keys, index-based scores)      |
| `error-reporter.ts` | Production error telemetry with localStorage + Sentry forwarding      |

### `/src/components/` — React UI Components

| File                   | Responsibility                                                              |
| ---------------------- | --------------------------------------------------------------------------- |
| `DecisionProvider.tsx` | React Context for state management, auto-save, URL share restore            |
| `Header.tsx`           | App header with decision selector, create/delete/reset, dark toggle, import |
| `DecisionBuilder.tsx`  | Title, options, criteria, scores matrix editor                              |
| `ResultsView.tsx`      | Rankings, breakdowns, top drivers, export, chart, share                     |
| `SensitivityView.tsx`  | Weight-swing analysis with interactive slider                               |
| `ScoreChart.tsx`       | Recharts-based bar and stacked breakdown chart (React.memo, lazy-loaded)    |
| `ThemeProvider.tsx`    | Dark/light mode via React Context + localStorage                            |
| `ErrorBoundary.tsx`    | Class-based error boundary with recovery UI and error reporting             |
| `Announcer.tsx`        | Live-region announcer for screen reader CRUD notifications                  |
| `DecisionSkeleton.tsx` | Pulsing placeholder skeleton shown during decision switching                |
| `Toast.tsx`            | Imperative toast notifications with auto-dismiss and undo actions           |
| `TemplatePicker.tsx`   | Modal template picker with focus trap and card grid                         |
| `ImportModal.tsx`      | File import dialog with CSV preview, drag-and-drop support                  |
| `CompareView.tsx`      | Side-by-side decision comparison with divergence analysis                   |
| `MonteCarloView.tsx`   | Monte Carlo simulation config, results, histograms, CIs                     |
| `ShareView.tsx`        | Read-only presentation view for shared decisions                            |
| `AuthButton.tsx`       | Sign in/out dropdown with GitHub and Google OAuth providers                 |
| `SyncStatus.tsx`       | Cloud sync status indicator with manual retry                               |
| `MigrationBanner.tsx`  | One-time localStorage → cloud migration prompt                              |

### `/src/hooks/` — Custom React Hooks

| File               | Responsibility                                                            |
| ------------------ | ------------------------------------------------------------------------- |
| `useValidation.ts` | Real-time validation hook — returns errors, warnings, infos for inline UI |
| `useAuth.ts`       | Supabase auth state hook — user, session, sign in/out, loading            |
| `useSync.ts`       | Cloud sync status hook — auto-sync on mount/focus, manual trigger         |

### `/src/app/` — Next.js App Router

| File             | Responsibility                                                |
| ---------------- | ------------------------------------------------------------- |
| `layout.tsx`     | Root layout with metadata, fonts, FOUC-prevention script      |
| `page.tsx`       | Main page with tab navigation, keyboard shortcuts             |
| `share/page.tsx` | Read-only share route — decodes and displays shared decisions |
| `manifest.ts`    | PWA web app manifest (name, icons, theme)                     |
| `sitemap.ts`     | Dynamic sitemap generation for SEO                            |
| `globals.css`    | Tailwind imports and CSS variables                            |

## Design Decisions

1. **Local-first with optional cloud**: All state in localStorage by default. When Supabase env vars are set, auth + cloud sync activate. Saves always go to localStorage first (instant), then to cloud (async, best-effort). See ADR-002.

2. **Pure scoring engine**: All scoring functions are pure (no side effects). This makes them easy to test and reason about.

3. **React Context over Redux**: For an app this size, Context + `useState` is simpler and sufficient. No unnecessary abstractions.

4. **Recharts for visualization**: Score comparison uses Recharts bar charts. Lazy-loaded via `React.lazy` + `Suspense` to keep initial bundle small. Adds ~45KB gzipped but provides responsive, accessible charts with minimal custom code.

5. **Single-page app**: All functionality on one page with tabs. Reduces complexity and keeps the UX focused.

6. **Security headers**: HTTP security headers (HSTS, X-Frame-Options, CSP, etc.) configured in `next.config.ts`.

7. **Dark mode**: System-preference-aware with localStorage persistence. FOUC prevented via inline `<script>` in layout.

8. **Inline validation**: `useValidation` hook provides memoized real-time feedback (errors, warnings, infos) without blocking save. Builder shows inline borders/messages; Results tab shows a guard for critical errors and a warning banner for non-blocking issues.

9. **Undo/Redo**: 50-entry history stack using `useRef` (avoids unnecessary re-renders). All mutation functions call `pushUndo()` before state update. `clearHistory()` resets on decision switch. Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z) work even inside inputs.

10. **Templates**: Pre-built decision templates defined statically in `src/lib/templates.ts`. `instantiateTemplate()` generates fresh IDs and zero scores. Template picker modal uses focus trap and accessible dialog pattern.

## Data Flow

```
User Input → DecisionProvider → Scoring Engine → Results
                    │
                    ▼
              localStorage (auto-save, 300ms debounce)
                    │
                    ▼ (if authenticated)
              Supabase Cloud (async, best-effort)
```

## Future Architecture

- **Web Workers**: Move scoring to a worker for large decisions
- **Real-time collaboration**: Supabase Realtime for live multi-user editing
- **Team workspaces**: Shared decision collections with role-based access
