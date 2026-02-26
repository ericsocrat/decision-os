# Copilot Instructions for Decision OS

## Project Overview

Decision OS is a structured decision-making web app. Users create decisions with options, criteria (weighted), and scores, then see rankings and sensitivity analysis. It is client-side only (localStorage) with a deterministic scoring engine.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + utility classes (with `dark:` variants)
- **Icons**: lucide-react
- **Charts**: Recharts (bar + stacked breakdown)
- **Compression**: lz-string (URL sharing)
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
│   ├── layout.tsx    # Root layout (metadata, fonts)
│   ├── page.tsx      # Main page (tab navigation)
│   └── globals.css   # Tailwind imports
├── components/       # React components
│   ├── DecisionProvider.tsx  # State management context + URL share restore
│   ├── DecisionBuilder.tsx   # Decision editor UI
│   ├── Header.tsx            # App header (branding, selector, dark toggle, import)
│   ├── ImportModal.tsx       # JSON/CSV import with preview and drag-and-drop
│   ├── CompareView.tsx       # Side-by-side decision comparison with divergence analysis
│   ├── MonteCarloView.tsx    # Monte Carlo simulation config, results, histograms
│   ├── ResultsView.tsx       # Rankings, chart, export, share
│   ├── SensitivityView.tsx   # Sensitivity analysis
│   ├── ScoreChart.tsx        # Recharts visualization
│   ├── ThemeProvider.tsx     # Dark/light mode context
│   ├── ErrorBoundary.tsx     # Error boundary with error reporting
│   ├── Announcer.tsx         # Live-region announcer for screen readers
│   ├── Toast.tsx             # Imperative toast notifications (showToast)
│   └── TemplatePicker.tsx    # Modal template picker with focus trap
├── hooks/            # Custom React hooks
│   └── useValidation.ts     # Memoized validation (errors/warnings/infos)
├── lib/              # Pure logic (no React)
│   ├── types.ts      # TypeScript type definitions
│   ├── scoring.ts    # Scoring engine (CRITICAL - see below)
│   ├── validation.ts # Input validation
│   ├── storage.ts    # localStorage CRUD
│   ├── demo-data.ts  # Demo decision data
│   ├── utils.ts      # Utilities
│   ├── templates.ts  # 8 pre-built decision templates
│   ├── import.ts     # JSON/CSV import parsing and validation
│   ├── comparison.ts # Decision comparison engine (deltas, agreement, heatmap)
│   ├── monte-carlo.ts # Monte Carlo simulation engine (PRNG, perturbation)
│   ├── share.ts      # Compact share encoding/decoding for /share route
│   └── error-reporter.ts  # Production error telemetry
└── __tests__/        # Unit tests (259 tests, 16 files)
    ├── scoring.test.ts
    ├── validation.test.ts
    ├── utils.test.ts
    ├── storage.test.ts
    ├── templates.test.ts
    ├── import.test.ts        # Import module tests (30 tests)
    ├── comparison.test.ts    # Comparison engine tests (33 tests)
    ├── error-reporter.test.ts  # Error reporter tests (9 tests)
    ├── monte-carlo.test.ts   # Monte Carlo engine tests (38 tests)
    ├── share.test.ts         # Share encoding/decoding tests (23 tests)
    ├── test-utils.tsx        # renderWithProviders helper
    └── components/           # Component integration tests
        ├── DecisionProvider.test.tsx
        ├── Header.test.tsx
        ├── DecisionBuilder.test.tsx
        ├── ResultsView.test.tsx
        ├── ThemeProvider.test.tsx
        └── ErrorBoundary.test.tsx
```

## CRITICAL RULES

### 1. Do NOT break the deterministic scoring engine

The scoring engine in `src/lib/scoring.ts` is the core of the app. It MUST be deterministic: identical inputs always produce identical outputs. If you modify any function in this file:

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

Everything in `src/lib/` must be pure functions with no React dependencies. This makes them easy to test and reuse. React-specific code goes in `src/components/`.

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

- All decision state flows through `DecisionProvider` (React Context)
- Auto-save to localStorage with 300ms debounce
- Never mutate state directly — always spread/copy
- Undo/redo history (50 entries max) via `undoStackRef` / `redoStackRef`
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

## Code Style

- 2-space indentation
- Double quotes for strings
- Trailing commas (ES5)
- Semicolons always
- Named exports preferred (except page components)
- JSDoc comments on all exported functions

## Before Committing Checklist

1. `npm run test` — all tests pass
2. `npm run lint` — no lint errors
3. `npm run format:check` — formatting correct
4. `npm run typecheck` — no type errors
5. `npm run build` — production build succeeds
6. All `dark:` variants added for any new UI elements
7. Destructive actions have confirmation dialogs
8. `npm run typecheck` — no type errors
9. `npm run build` — production build succeeds
10. Manual check — app works in browser
