# Architecture

## Overview

Decision OS is a client-side web application built with Next.js 16 (App Router), React 19, and TypeScript (strict mode). It uses a local-first architecture — all data lives in the browser's localStorage by default, with optional Supabase-powered cloud sync for cross-device access. The app implements multiple MCDA (Multi-Criteria Decision Analysis) algorithms, Monte Carlo simulation, cognitive bias detection, and data enrichment — all running entirely in the browser.

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                           │
│                                                                      │
│  ┌─────────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │  Decision    │ │ Results  │ │ Sensitivity│ │ Compare / MC /   │  │
│  │  Builder     │ │ View     │ │ Analysis   │ │ Pareto / Quality │  │
│  └──────┬───────┘ └────┬─────┘ └─────┬──────┘ └────────┬─────────┘  │
│         │              │             │                  │            │
│  ┌──────▼──────────────▼─────────────▼──────────────────▼─────────┐ │
│  │              DecisionProvider (4 Focused Contexts)              │ │
│  │  DecisionDataCtx · ResultsCtx · ActionsCtx · DispatchCtx       │ │
│  │  + backward-compatible DecisionContext (combines all)           │ │
│  └──────┬──────────────┬─────────────────────────┬────────────────┘ │
│         │              │                         │                  │
│  ┌──────▼────────┐ ┌───▼──────────────────┐ ┌───▼────────────────┐ │
│  │ decision-     │ │ Scoring + Analytics  │ │ Storage Layer      │ │
│  │ reducer.ts    │ │ scoring · topsis ·   │ │ localStorage       │ │
│  │ (useReducer)  │ │ ahp · regret ·      │ │ + cloud (Supabase) │ │
│  │ + undo/redo   │ │ consensus · pareto  │ │ + sync engine      │ │
│  └───────────────┘ └────────────────────┘  └──────────────────────┘ │
│                          │                                          │
│                   ┌──────▼──────────┐                               │
│                   │  Web Worker      │                               │
│                   │  (Monte Carlo)   │                               │
│                   └─────────────────┘                                │
└──────────────────────────────────────────────────────────────────────┘
```

## Module Boundaries

### `/src/lib/` — Core Logic (37 modules, pure, no React)

#### Core Domain

| File                  | Responsibility                                                                        |
| --------------------- | ------------------------------------------------------------------------------------- |
| `types.ts`            | TypeScript type definitions for the entire domain                                     |
| `scoring.ts`          | Deterministic WSM scoring engine (single-pass weighted sum, sensitivity analysis)     |
| `validation.ts`       | Input validation with structured error messages + runtime type guards                 |
| `decision-reducer.ts` | Pure reducer + typed actions for decision state, with undo/redo coalescing middleware |
| `completeness.ts`     | Computes score-matrix completeness (filled/total counts, percentage, color tier)      |

#### Multi-Criteria Analysis (MCDA)

| File                      | Responsibility                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `ahp.ts`                  | Analytic Hierarchy Process — derives weights from pairwise comparisons (Saaty eigenvector, CR validation) |
| `topsis.ts`               | TOPSIS ranking — closeness coefficient to ideal/anti-ideal solutions (Hwang & Yoon 1981)                  |
| `regret.ts`               | Minimax Regret — non-compensatory method penalizing extreme per-criterion weaknesses (Savage 1951)        |
| `consensus.ts`            | Multi-algorithm consensus — runs WSM/TOPSIS/Regret, unifies via Borda count with Kendall's W              |
| `composite-confidence.ts` | Unifies 4 confidence signals into a single weighted composite metric                                      |
| `monte-carlo.ts`          | Monte Carlo simulation engine (seeded PRNG, perturbation, confidence distributions)                       |
| `pareto.ts`               | Pareto frontier computation — non-dominated options via O(n²) dominance testing                           |
| `decision-quality.ts`     | Structural quality scoring with actionable improvement suggestions                                        |
| `bias-detection.ts`       | Detects 7 cognitive biases (halo, anchoring, uniformity, etc.) with severity ratings                      |
| `patterns.ts`             | Cross-decision pattern recognition (scoring biases, weight preferences, criterion reuse)                  |

#### Data & Storage

| File                | Responsibility                                                           |
| ------------------- | ------------------------------------------------------------------------ |
| `storage.ts`        | localStorage CRUD operations                                             |
| `cloud-storage.ts`  | Supabase cloud CRUD (guarded, returns empty when offline)                |
| `sync.ts`           | Bidirectional sync engine (local ↔ cloud, last-write-wins)               |
| `supabase.ts`       | Supabase client singleton with feature-flag guard                        |
| `supabase-types.ts` | Generated Supabase Database types for the decisions table                |
| `rate-limiter.ts`   | Client-side rate limiter with exponential backoff for Supabase API calls |

#### Feature Modules

| File                  | Responsibility                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `comparison.ts`       | Decision comparison engine (deltas, Spearman agreement score, heatmap)                      |
| `share.ts`            | Compact share encoding/decoding (short keys, index-based scores, lz-string)                 |
| `share-link.ts`       | Server-stored shareable links — short IDs via Supabase `shared_decisions` table             |
| `import.ts`           | JSON/CSV import parsing, preview, validation, and file reading                              |
| `templates.ts`        | 8 pre-built decision templates with `instantiateTemplate()` factory                         |
| `journal.ts`          | Decision journal — CRUD for structured entries (notes, reasoning, outcomes) in localStorage |
| `outcome-tracking.ts` | Records post-decision outcomes, compares actual vs. predicted scores                        |
| `provenance.ts`       | Per-cell score provenance metadata (manual, enriched, or user-overridden)                   |

#### Utilities

| File                | Responsibility                                                        |
| ------------------- | --------------------------------------------------------------------- |
| `utils.ts`          | Utilities (ID generation, URL encoding/decoding, relative time)       |
| `demo-data.ts`      | Preloaded demo decision                                               |
| `error-reporter.ts` | Production error telemetry with localStorage + Sentry forwarding      |
| `sanitize.ts`       | Input sanitization — strips control chars, zero-width, bidi overrides |
| `i18n.tsx`          | Internationalization context + `useTranslation()` hook (en, es, fr)   |

#### Data Enrichment (`/src/lib/data/`)

| File             | Responsibility                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `engine.ts`      | Enrichment engine — 3-tier fallback (live → bundled → estimated), per-provider timeouts              |
| `estimation.ts`  | Tier 3 estimation — income-group proxy, regional proxy, composite strategies                         |
| `provider.ts`    | Abstract `DataProvider` base class with caching and min-max normalization                            |
| `registry.ts`    | Provider registry — holds all registered providers for lookup                                        |
| `datasets/*.ts`  | Bundled datasets: cost-of-living, country-risk, quality-of-life, tax-efficiency, university-rankings |
| `providers/*.ts` | Data providers: cost-of-living, country-risk, quality-of-life, tax-efficiency, university-rankings   |

### `/src/components/` — React UI Components (50 files)

#### Core Layout & State

| File                         | Responsibility                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `DecisionProvider.tsx`       | 4 focused contexts + backward-compatible context; auto-save; URL share restore      |
| `Header.tsx`                 | App header: decision selector, create/delete/reset, dark toggle, import, i18n, auth |
| `ErrorBoundary.tsx`          | Class-based error boundary with recovery UI and error reporting                     |
| `TabErrorFallback.tsx`       | Lightweight tab-level error fallback with retry button                              |
| `ThemeProvider.tsx`          | Dark/light mode via React Context + localStorage                                    |
| `Announcer.tsx`              | Live-region announcer for screen reader CRUD notifications                          |
| `Toast.tsx`                  | Imperative toast notifications with auto-dismiss and undo actions                   |
| `DecisionSkeleton.tsx`       | Pulsing placeholder skeleton shown during decision switching                        |
| `ServiceWorkerRegistrar.tsx` | SW registration, offline banner, new-version refresh prompt                         |

#### Decision Building

| File                        | Responsibility                                                            |
| --------------------------- | ------------------------------------------------------------------------- |
| `DecisionBuilder.tsx`       | Title, options, criteria, scores matrix editor (React.memo, 800+ lines)   |
| `ScoreSlider.tsx`           | Touch-optimized 0–10 range slider with ≥44px target and color coding      |
| `WeightSlider.tsx`          | Range slider + number input for criterion weights with ARIA attributes    |
| `WeightDistributionBar.tsx` | Stacked horizontal bar showing normalized weight percentages              |
| `MobileScoreCards.tsx`      | Accordion card layout for mobile scoring with sliders and confidence dots |
| `SortableItem.tsx`          | @dnd-kit/sortable drag-and-drop wrapper with accessible grip handle       |
| `ScoringPrompt.tsx`         | Contextual scoring guidance — anchor prompts (1/5/10) and calibration     |
| `CriterionTooltip.tsx`      | Accessible hover/focus/touch tooltip for criterion descriptions           |
| `ReasoningPopover.tsx`      | Per-score reasoning notes popover with filled-icon indicator              |
| `CompletionRing.tsx`        | SVG circular progress indicator for score-matrix completeness             |
| `QualityBar.tsx`            | Overall quality score bar with expandable per-check indicators            |

#### Results & Analysis

| File                  | Responsibility                                                     |
| --------------------- | ------------------------------------------------------------------ |
| `ResultsView.tsx`     | Rankings, breakdowns, top drivers, export, chart, share            |
| `ScoreChart.tsx`      | Recharts bar + stacked breakdown chart (React.memo, lazy-loaded)   |
| `SensitivityView.tsx` | Weight-swing analysis with interactive slider                      |
| `CompareView.tsx`     | Side-by-side decision comparison with divergence analysis          |
| `MonteCarloView.tsx`  | Monte Carlo simulation config, results, histograms, CIs            |
| `ParetoChart.tsx`     | Recharts scatter plot with Pareto frontier line and axis selectors |
| `WhatIfPanel.tsx`     | Sandboxed what-if overlay with real-time rank comparison           |

#### Multi-Algorithm & Confidence

| File                               | Responsibility                                                      |
| ---------------------------------- | ------------------------------------------------------------------- |
| `FrameworkComparison.tsx`          | WSM/TOPSIS/Minimax Regret side-by-side with Kendall's W consensus   |
| `HybridResults.tsx`                | Consensus ranking table with color-coded agreement indicators       |
| `AHPWizard.tsx`                    | Step-by-step pairwise comparison wizard for AHP weight derivation   |
| `ConfidenceDot.tsx`                | Clickable green/amber/red dot cycling through confidence levels     |
| `ConfidenceIndicator.tsx`          | Enriched-score reliability badge (Tier 1/2/3) with tooltip          |
| `CompositeConfidenceIndicator.tsx` | Traffic-light composite confidence badge with expandable breakdown  |
| `ConfidenceStrategySelector.tsx`   | Radio selector: display-only / penalize / widen-MC confidence modes |
| `ScoreProvenanceIndicator.tsx`     | Manual/enriched/overridden badge with restore-enriched action       |

#### Bias & Patterns

| File                  | Responsibility                                                       |
| --------------------- | -------------------------------------------------------------------- |
| `BiasWarnings.tsx`    | Cognitive bias warnings as dismissible, severity-styled cards        |
| `PatternInsights.tsx` | Cross-decision pattern cards with confidence indicators and evidence |

#### Lifecycle & Retrospective

| File                    | Responsibility                                                             |
| ----------------------- | -------------------------------------------------------------------------- |
| `OutcomeTracker.tsx`    | Records outcomes (chosen option, rating, notes) with prediction comparison |
| `RetrospectiveView.tsx` | Decision lifecycle timeline with journal, milestones, and markdown export  |

#### Data Enrichment

| File                    | Responsibility                                                      |
| ----------------------- | ------------------------------------------------------------------- |
| `EnrichmentSuggest.tsx` | Suggests auto-fill data queries; users accept, dismiss, or override |

#### Import & Share

| File                 | Responsibility                                             |
| -------------------- | ---------------------------------------------------------- |
| `ImportModal.tsx`    | File import dialog with CSV preview, drag-and-drop support |
| `TemplatePicker.tsx` | Modal template picker with focus trap and card grid        |
| `ShareView.tsx`      | Read-only presentation view for shared decisions           |

#### Auth & Sync

| File                  | Responsibility                                              |
| --------------------- | ----------------------------------------------------------- |
| `AuthButton.tsx`      | Sign in/out dropdown with GitHub and Google OAuth providers |
| `SyncStatus.tsx`      | Cloud sync status indicator with manual retry               |
| `MigrationBanner.tsx` | One-time localStorage → cloud migration prompt              |

#### UX & Onboarding

| File                         | Responsibility                                                  |
| ---------------------------- | --------------------------------------------------------------- |
| `CoachmarkOverlay.tsx`       | 3-step onboarding tour with positioned tooltips and focus trap  |
| `KeyboardShortcutsModal.tsx` | Modal displaying global keyboard shortcuts with focus trap      |
| `MobileOverflowMenu.tsx`     | Kebab-triggered dropdown for header actions on narrow viewports |
| `LanguageSwitcher.tsx`       | Locale-switching dropdown (en/es/fr) persisted to localStorage  |

### `/src/hooks/` — Custom React Hooks (6 files)

| File                     | Responsibility                                                          |
| ------------------------ | ----------------------------------------------------------------------- |
| `useValidation.ts`       | Memoized real-time validation — errors, warnings, infos for inline UI   |
| `useAuth.ts`             | Supabase auth state — user, session, sign in/out, loading               |
| `useSync.ts`             | Cloud sync status — auto-sync on mount/focus, manual trigger            |
| `useBiasDetection.ts`    | Debounced (500ms) bias detection with per-type dismissal management     |
| `useMonteCarloWorker.ts` | Runs Monte Carlo in a Web Worker with progress, cancellation, fallback  |
| `useOnboarding.ts`       | Onboarding state machine (idle → step1–3), auto-triggers on first visit |

### `/src/workers/` — Web Workers (1 file)

| File                    | Responsibility                                                    |
| ----------------------- | ----------------------------------------------------------------- |
| `monte-carlo.worker.ts` | Off-main-thread Monte Carlo simulation via typed message protocol |

### `/src/app/` — Next.js App Router

| File             | Responsibility                                                               |
| ---------------- | ---------------------------------------------------------------------------- |
| `layout.tsx`     | Root layout with metadata, fonts, FOUC-prevention script                     |
| `page.tsx`       | Main page with tab navigation, keyboard shortcuts, conditional tab rendering |
| `not-found.tsx`  | Custom 404 page                                                              |
| `share/page.tsx` | Read-only share route — decodes and displays shared decisions                |
| `manifest.ts`    | PWA web app manifest (name, icons, theme)                                    |
| `sitemap.ts`     | Dynamic sitemap generation for SEO                                           |
| `globals.css`    | Tailwind imports and CSS variables                                           |

### `/src/lib/i18n/` — Localization Data

| File      | Responsibility       |
| --------- | -------------------- |
| `en.json` | English translations |
| `es.json` | Spanish translations |
| `fr.json` | French translations  |

## Design Decisions

1. **Local-first with optional cloud**: All state in localStorage by default. When Supabase env vars are set, auth + cloud sync activate. Saves always go to localStorage first (instant), then to cloud (async, best-effort). See ADR-002.

2. **Pure scoring engine**: All scoring functions are pure (no side effects). This makes them easy to test and reason about. The WSM `scoreOption()` uses a single-pass loop to eliminate redundant iterations.

3. **Focused Contexts over monolithic Context**: State is split into 4 focused contexts (`DecisionDataCtx`, `ResultsCtx`, `ActionsCtx`, `DecisionDispatchContext`) to prevent unnecessary re-renders. A backward-compatible `DecisionContext` combines all for legacy consumers. Components import only the context they need via `useDecisionData()`, `useResultsContext()`, `useActions()`, or `useDecisionDispatch()`.

4. **useReducer + pure reducer**: Decision state mutations flow through `decision-reducer.ts` — a pure reducer with typed action discriminated unions. Undo/redo coalescing middleware wraps the core reducer. 50-entry history stack via `useRef`.

5. **Recharts for visualization**: Score charts and Pareto plots use Recharts. Lazy-loaded via `React.lazy` + `Suspense` to keep initial bundle small.

6. **Conditional tab rendering**: Only the active tab's component mounts (DecisionBuilder is always-mounted). Inactive tabs render a skeleton `<output>` placeholder. This eliminates thousands of unnecessary DOM nodes.

7. **Single-page app**: All functionality on one page with 7 tabs (Builder, Results, Sensitivity, Compare, Monte Carlo, Pareto, Quality). Keyboard shortcuts 1–7 switch tabs.

8. **Security headers**: HTTP security headers (HSTS, X-Frame-Options, CSP, etc.) configured in `next.config.ts`.

9. **Dark mode**: System-preference-aware with localStorage persistence. FOUC prevented via inline `<script>` in layout.

10. **Inline validation**: `useValidation` hook provides memoized real-time feedback. Builder shows inline borders/messages; Results tab shows a guard for critical errors.

11. **Templates**: Pre-built decision templates defined statically in `src/lib/templates.ts`. `instantiateTemplate()` generates fresh IDs and zero scores.

12. **Web Worker for Monte Carlo**: Heavy simulation runs off-main-thread via `monte-carlo.worker.ts`. The `useMonteCarloWorker` hook manages the lifecycle with progress tracking and cancellation. Falls back to main thread when Workers are unavailable.

13. **Multi-algorithm consensus**: Beyond WSM, the app runs TOPSIS and Minimax Regret in parallel, then unifies rankings via Borda count. Kendall's W measures concordance across algorithms.

14. **3-tier data enrichment**: The enrichment engine tries live providers first, falls back to bundled datasets, then to estimation via income-group/regional proxies. All enriched scores carry provenance and confidence metadata.

15. **i18n**: React context-based i18n with `useTranslation()` hook. Locale files in `src/lib/i18n/` (en, es, fr). Persisted to localStorage via `LanguageSwitcher`.

## Data Flow

```
User Input → DecisionProvider (useReducer) → decision-reducer.ts
                    │
          ┌─────────┼──────────────────────────────────┐
          ▼         ▼                                  ▼
    Scoring    TOPSIS/AHP/Regret              Bias Detection
    Engine     Consensus Engine               Pattern Recognition
          │         │                                  │
          └─────────┼──────────────────────────────────┘
                    ▼
              ResultsCtx → UI Components
                    │
                    ▼
              localStorage (auto-save, 300ms debounce)
                    │
                    ▼ (if authenticated)
              Supabase Cloud (async, best-effort)
```

## Testing

- **Unit tests**: 1502 tests across 84 files (Vitest + React Testing Library)
- **E2E tests**: 43 tests across 5 specs (Playwright — smoke, accessibility, visual, workflows, features)
- **Coverage**: V8 provider with enforced thresholds per `vitest.config.ts`

## Future Architecture

- **Real-time collaboration**: Supabase Realtime for live multi-user editing
- **Team workspaces**: Shared decision collections with role-based access
- **Shareable decision links**: Server-stored decisions for persistent sharing
