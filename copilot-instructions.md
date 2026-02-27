# Copilot Instructions for Decision OS

## Project Overview

Decision OS is a structured decision-making web app. Users create decisions with options, criteria (weighted), and scores, then see rankings, sensitivity analysis, Monte Carlo simulations, Pareto frontiers, and multi-algorithm consensus. Uses localStorage by default with optional Supabase-powered auth + cloud sync (feature-flagged behind `NEXT_PUBLIC_SUPABASE_URL`). Supports i18n (en/es/fr), data enrichment, cognitive bias detection, and decision journaling.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript (strict mode) + React 19
- **Styling**: Tailwind CSS 4 + utility classes (with `dark:` variants)
- **Icons**: lucide-react
- **Charts**: Recharts (bar, stacked, scatter/Pareto)
- **Auth/Cloud**: Supabase (optional, via `@supabase/supabase-js`)
- **Compression**: lz-string (URL sharing)
- **DnD**: @dnd-kit (drag-and-drop reordering)
- **Testing**: Vitest + React Testing Library + Playwright E2E
- **Linting**: ESLint + Prettier
- **CI**: GitHub Actions (format:check → lint → typecheck → test:coverage → build → E2E)
- **Deployment**: Vercel (auto-deploy on push to main)

## Commands

```bash
npm run dev           # Start dev server on localhost:3000
npm run build         # Production build
npm run test          # Run all unit tests (Vitest)
npm run test:watch    # Watch mode for tests
npm run test:coverage # Run tests with V8 coverage (enforced thresholds)
npm run test:e2e      # Run Playwright E2E tests
npm run lint          # ESLint check
npm run typecheck     # TypeScript type check
npm run format        # Prettier format all files
npm run format:check  # Prettier check (used in CI)
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout (metadata, fonts, FOUC-prevention)
│   ├── page.tsx      # Main page (7-tab navigation, keyboard shortcuts)
│   ├── not-found.tsx # Custom 404 page
│   ├── share/page.tsx# Read-only share route
│   └── globals.css   # Tailwind imports
├── components/       # React components (50 files)
│   ├── DecisionProvider.tsx  # 4 focused contexts + backward-compatible context
│   ├── DecisionBuilder.tsx   # Decision editor UI (React.memo, 800+ lines)
│   ├── Header.tsx            # App header (selector, dark toggle, auth, sync, i18n)
│   ├── ResultsView.tsx       # Rankings, chart, export, share
│   ├── SensitivityView.tsx   # Sensitivity analysis
│   ├── CompareView.tsx       # Side-by-side decision comparison
│   ├── MonteCarloView.tsx    # Monte Carlo simulation config + results
│   ├── ParetoChart.tsx       # Pareto frontier scatter plot
│   ├── FrameworkComparison.tsx # WSM/TOPSIS/Regret side-by-side consensus
│   ├── HybridResults.tsx     # Multi-algorithm consensus ranking table
│   ├── AHPWizard.tsx         # Pairwise comparison wizard for AHP weights
│   ├── WhatIfPanel.tsx       # Sandboxed what-if overlay with rank comparison
│   ├── BiasWarnings.tsx      # Cognitive bias warning cards
│   ├── PatternInsights.tsx   # Cross-decision pattern analysis cards
│   ├── OutcomeTracker.tsx    # Post-decision outcome recording
│   ├── RetrospectiveView.tsx # Decision lifecycle timeline + journal
│   ├── EnrichmentSuggest.tsx # Data enrichment suggestion flow
│   ├── QualityBar.tsx        # Decision quality dashboard
│   ├── ScoreChart.tsx        # Recharts visualization (lazy-loaded)
│   ├── ThemeProvider.tsx     # Dark/light mode context
│   ├── ErrorBoundary.tsx     # Error boundary with error reporting
│   ├── TabErrorFallback.tsx  # Tab-level error fallback
│   ├── Announcer.tsx         # Live-region announcer for screen readers
│   ├── Toast.tsx             # Imperative toast notifications (showToast)
│   ├── TemplatePicker.tsx    # Modal template picker with focus trap
│   ├── ImportModal.tsx       # JSON/CSV import with preview and drag-and-drop
│   ├── ShareView.tsx         # Read-only shared decision view
│   ├── AuthButton.tsx        # Sign in/out dropdown with OAuth providers
│   ├── SyncStatus.tsx        # Cloud sync status indicator
│   ├── MigrationBanner.tsx   # One-time localStorage → cloud migration prompt
│   ├── KeyboardShortcutsModal.tsx # Keyboard shortcuts modal with focus trap
│   ├── CoachmarkOverlay.tsx  # 3-step onboarding tour overlay
│   ├── LanguageSwitcher.tsx  # Locale-switching dropdown (en/es/fr)
│   ├── MobileOverflowMenu.tsx # Kebab menu for narrow viewports
│   ├── MobileScoreCards.tsx  # Accordion card layout for mobile scoring
│   ├── ServiceWorkerRegistrar.tsx # SW registration + offline banner
│   ├── ScoreSlider.tsx       # Touch-optimized 0–10 range slider
│   ├── WeightSlider.tsx      # Range slider + number input for weights
│   ├── WeightDistributionBar.tsx # Stacked weight percentage bar
│   ├── CompletionRing.tsx    # SVG circular completeness indicator
│   ├── ConfidenceDot.tsx     # Clickable confidence level dot
│   ├── ConfidenceIndicator.tsx # Enriched-score reliability badge
│   ├── CompositeConfidenceIndicator.tsx # Traffic-light composite badge
│   ├── ConfidenceStrategySelector.tsx # Confidence mode selector
│   ├── ScoreProvenanceIndicator.tsx # Manual/enriched/overridden badge
│   ├── CriterionTooltip.tsx  # Accessible criterion description tooltip
│   ├── ReasoningPopover.tsx  # Per-score reasoning notes popover
│   ├── ScoringPrompt.tsx     # Contextual scoring guidance prompts
│   ├── SortableItem.tsx      # @dnd-kit sortable drag-and-drop wrapper
│   └── DecisionSkeleton.tsx  # Pulsing placeholder skeleton
├── hooks/            # Custom React hooks (6 files)
│   ├── useValidation.ts     # Memoized validation (errors/warnings/infos)
│   ├── useAuth.ts           # Supabase auth state (user, session, sign in/out)
│   ├── useSync.ts           # Cloud sync status (auto-sync, manual trigger)
│   ├── useBiasDetection.ts  # Debounced bias detection with dismissal management
│   ├── useMonteCarloWorker.ts # Web Worker MC with progress + cancellation
│   └── useOnboarding.ts     # Onboarding state machine (idle → step1–3)
├── workers/          # Web Workers
│   └── monte-carlo.worker.ts # Off-thread Monte Carlo simulation
├── lib/              # Pure logic, no React (37 modules)
│   ├── types.ts      # TypeScript type definitions
│   ├── scoring.ts    # WSM scoring engine (single-pass, sensitivity analysis)
│   ├── validation.ts # Input validation
│   ├── decision-reducer.ts # Pure reducer + typed actions + undo/redo coalescing
│   ├── completeness.ts # Score-matrix completeness computation
│   ├── ahp.ts        # Analytic Hierarchy Process (Saaty eigenvector, CR)
│   ├── topsis.ts     # TOPSIS ranking (closeness coefficient)
│   ├── regret.ts     # Minimax Regret (Savage 1951)
│   ├── consensus.ts  # Multi-algorithm consensus (Borda count, Kendall's W)
│   ├── composite-confidence.ts # Weighted composite confidence metric
│   ├── monte-carlo.ts # Monte Carlo simulation engine (PRNG, perturbation)
│   ├── pareto.ts     # Pareto frontier (non-dominated options)
│   ├── decision-quality.ts # Structural quality scoring + suggestions
│   ├── bias-detection.ts # 7 cognitive biases with severity ratings
│   ├── patterns.ts   # Cross-decision pattern recognition
│   ├── storage.ts    # localStorage CRUD
│   ├── cloud-storage.ts # Supabase cloud CRUD
│   ├── sync.ts       # Bidirectional sync engine (last-write-wins)
│   ├── supabase.ts   # Supabase client singleton
│   ├── supabase-types.ts # Generated Supabase Database types
│   ├── rate-limiter.ts # Client-side rate limiter with exponential backoff
│   ├── comparison.ts # Decision comparison (deltas, Spearman, heatmap)
│   ├── share.ts      # Compact share encoding/decoding (lz-string)
│   ├── import.ts     # JSON/CSV import parsing and validation
│   ├── templates.ts  # 8 pre-built decision templates
│   ├── journal.ts    # Decision journal CRUD (localStorage)
│   ├── outcome-tracking.ts # Post-decision outcome recording
│   ├── provenance.ts # Per-cell score provenance metadata
│   ├── demo-data.ts  # Demo decision data
│   ├── utils.ts      # Utilities (ID gen, URL encoding, relative time)
│   ├── error-reporter.ts # Error telemetry (localStorage + Sentry)
│   ├── sanitize.ts   # Input sanitization (control chars, bidi)
│   ├── i18n.tsx      # i18n context + useTranslation() hook
│   ├── i18n/         # Locale files (en.json, es.json, fr.json)
│   └── data/         # Data enrichment subsystem
│       ├── engine.ts     # 3-tier enrichment (live → bundled → estimated)
│       ├── estimation.ts # Tier 3 estimation (income-group, regional proxy)
│       ├── provider.ts   # Abstract DataProvider base class
│       ├── registry.ts   # Provider registry
│       ├── datasets/     # Bundled datasets (cost-of-living, country-risk, etc.)
│       └── providers/    # Data providers (cost-of-living, country-risk, etc.)
└── __tests__/        # Unit tests (1502 tests, 84 files)
    ├── scoring.test.ts
    ├── validation.test.ts
    ├── utils.test.ts
    ├── storage.test.ts
    ├── templates.test.ts
    ├── import.test.ts
    ├── comparison.test.ts
    ├── error-reporter.test.ts
    ├── monte-carlo.test.ts
    ├── share.test.ts
    ├── cloud-storage.test.ts
    ├── sync.test.ts
    ├── decision-reducer.test.ts
    ├── ahp.test.ts
    ├── bias-detection.test.ts
    ├── completeness.test.ts
    ├── confidence-scoring.test.ts
    ├── consensus.test.ts
    ├── i18n.test.ts
    ├── journal.test.ts
    ├── outcome-tracking.test.ts
    ├── pareto.test.ts
    ├── patterns.test.tsx
    ├── provenance.test.ts
    ├── rate-limiter.test.ts
    ├── regret.test.ts
    ├── topsis.test.ts
    ├── a11y.test.tsx
    ├── csp-headers.test.ts
    ├── performance.test.ts
    ├── security.test.ts
    ├── test-utils.tsx
    ├── components/     # 32 component test files
    ├── hooks/          # Hook tests (useAuth, useSync, useValidation)
    └── data/           # Data enrichment tests
e2e/                  # Playwright E2E tests (43 tests, 5 specs)
    ├── smoke.spec.ts
    ├── accessibility.spec.ts
    ├── visual.spec.ts
    ├── workflows.spec.ts
    └── features.spec.ts
```

## CRITICAL RULES

### 1. Do NOT break the deterministic scoring engine

The scoring engine in `src/lib/scoring.ts` is the core of the app. It MUST be deterministic: identical inputs always produce identical outputs. `scoreOption()` uses a single-pass loop for efficiency. If you modify any function in this file:

- Update `docs/SCORING_MODEL.md` to match
- Update or add unit tests in `src/__tests__/scoring.test.ts`
- Verify all 40+ tests still pass
- Do NOT introduce randomness (unless using a deterministic seed with documentation)

### 2. Types are mandatory

- All code must be TypeScript with strict mode
- No `any` types unless there's a documented reason
- All public function parameters and returns must be typed
- Domain types live in `src/lib/types.ts`

### 3. Pure functions in /lib

Everything in `src/lib/` must be pure functions with no React dependencies, **except** `i18n.tsx` (React context). This makes them easy to test and reuse. React-specific code goes in `src/components/`.

### 4. Testing requirements

- All scoring engine changes need unit tests
- Run `npm run test` before committing
- Test edge cases: empty arrays, zero weights, NaN inputs, boundary values

### 5. Accessibility

- All interactive elements must be keyboard accessible
- Use semantic HTML elements (`<nav>`, `<main>`, `<section>`, etc.)
- Add `aria-label` to buttons without visible text
- Use `role="tablist"`, `role="tab"`, `role="tabpanel"` for tab interfaces
- Use `aria-describedby` on inputs that need range/format hints
- Use `aria-live` regions (via `useAnnounce()`) for dynamic content changes
- Use `aria-invalid` on inputs with validation errors
- Use `useValidation()` hook for inline validation feedback in Builder
- Score matrix grid supports arrow-key navigation (WAI-ARIA grid pattern)

### 6. Styling conventions

- Use Tailwind utility classes with `dark:` variants for all new elements
- No custom CSS unless absolutely necessary
- Mobile-responsive (test on narrow viewports)
- All user-facing elements must support dark mode

### 7. State management

- Decision state flows through `DecisionProvider` which uses `useReducer` + `decision-reducer.ts`
- 4 focused contexts for surgical re-renders: `DecisionDataCtx`, `ResultsCtx`, `ActionsCtx`, `DecisionDispatchContext`
- Backward-compatible `DecisionContext` combines all (use focused hooks for new code)
- **Focused hooks**: `useDecisionData()` (data + nav), `useResultsContext()` (computed results), `useActions()` (stable action wrappers), `useDecisionDispatch()` (raw dispatch)
- Auto-save to localStorage with 300ms debounce
- Never mutate state directly — dispatch typed actions through the reducer
- Undo/redo history (50 entries max) via `undoStackRef` / `redoStackRef` with coalescing middleware
- All mutations call `pushUndo(prev)` before state update
- `clearHistory()` resets on decision switch
- Use `showToast()` with `{ action: { label: "Undo", onClick: undo } }` for destructive actions

### 8. Templates

- Template definitions in `src/lib/templates.ts` (`TEMPLATES` array)
- `instantiateTemplate(template)` generates fresh IDs and zero scores
- Add new templates by appending to the `TEMPLATES` array
- Template weights should sum to 100, minimum 2 options and 1 criterion

### 9. No external data fetching

- Do NOT scrape websites or call external APIs
- Any external data must be documented in `docs/DATA_SOURCES.md`
- The app must work fully offline (after initial load)

### 10. Import handling

- Import logic lives in `src/lib/import.ts` (pure functions, no React)
- JSON import supports both full Decision and results export format
- CSV import uses a lightweight parser (no external dependencies)
- Always generate fresh `id` and `createdAt` for imported decisions
- File size limit: 1 MB. Validate file type before reading.
- CSV import has a preview step — users confirm before data is saved

### 11. Error reporting

- Use `reportError(error, { source: "..." })` from `src/lib/error-reporter.ts`
- In development: console.error only (no localStorage writes)
- In production: logs + stores in localStorage (max 20, FIFO)
- Sentry forwarding activates when `@sentry/nextjs` is loaded
- No user PII is captured — Decision OS has no accounts
- ErrorBoundary, storage, import modules should all use `reportError()`

### 12. Visual regression testing

- Visual tests in `e2e/visual.spec.ts` use Playwright `toHaveScreenshot()`
- Baselines stored in `e2e/visual.spec.ts-snapshots/` (committed to git)
- Only Chromium project runs visual tests (cross-browser diffs are expected)
- Generate baselines: `npx playwright test e2e/visual.spec.ts --update-snapshots`
- Use `maxDiffPixelRatio: 0.01` (1%) for most tests, 0.02 for mobile/empty

### 13. Comparison mode

- Comparison engine is in `src/lib/comparison.ts` — pure functions, no React
- Options/criteria matched by **name** (case-insensitive, trimmed)
- Agreement score uses Spearman's rank correlation mapped to 0–1
- Divergence colors: green (|Δ| ≤ 1), yellow (|Δ| 2–3), red (|Δ| ≥ 4)
- Compare tab is the 4th tab (keyboard shortcut: `4`)

### 14. Internationalization (i18n)

- i18n context + `useTranslation()` hook in `src/lib/i18n.tsx`
- Locale files in `src/lib/i18n/` (en.json, es.json, fr.json)
- All user-facing strings must use `t("namespace.key")` — no hardcoded English
- Locale persisted to localStorage via `LanguageSwitcher` component
- English is the fallback locale — missing keys fall back to `en.json`

### 15. MCDA algorithms

- **WSM** (Weighted Sum Model) in `scoring.ts` — primary ranking algorithm
- **TOPSIS** in `topsis.ts` — closeness to ideal/anti-ideal solutions
- **Minimax Regret** in `regret.ts` — non-compensatory, penalizes extreme weaknesses
- **AHP** in `ahp.ts` — derives weights from pairwise comparisons (consistency ratio must be < 0.1)
- **Consensus** in `consensus.ts` — Borda count unification + Kendall's W concordance
- All MCDA modules are pure functions with comprehensive unit tests

### 16. Data enrichment

- 3-tier fallback: live provider → bundled dataset → estimation
- Providers and datasets in `src/lib/data/providers/` and `src/lib/data/datasets/`
- Abstract `DataProvider` base class in `src/lib/data/provider.ts`
- Enriched scores carry provenance metadata (source, confidence, timestamp)
- Users can override enriched values; provenance tracks manual overrides

## Code Style

- 2-space indentation
- Double quotes for strings
- Trailing commas (ES5)
- Semicolons always
- Named exports preferred (except page components)
- JSDoc comments on all exported functions

## Before Committing Checklist

1. `npm run test` — all 1502+ unit tests pass
2. `npm run lint` — no lint errors
3. `npm run format:check` — formatting correct
4. `npm run typecheck` — no type errors
5. `npm run build` — production build succeeds
6. All `dark:` variants added for any new UI elements
7. Destructive actions have confirmation dialogs
8. All user-facing strings use `t()` from i18n
9. Manual check — app works in browser
