# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Auth + Cloud Sync**: Optional Supabase-powered authentication (GitHub + Google OAuth) and cloud database for cross-device access. Feature-flagged behind `NEXT_PUBLIC_SUPABASE_URL` env var — app remains fully functional in local-only mode without Supabase. Includes: `useAuth` hook with sign in/out, `useSync` hook with auto-sync on mount + window focus, `AuthButton` dropdown with OAuth providers, `SyncStatus` indicator, `MigrationBanner` for one-click localStorage→cloud upload. Sync engine uses last-write-wins conflict resolution by `updatedAt`. DecisionProvider auto-syncs to cloud on every save. Supabase schema with RLS (row-level security) ensures user-scoped decisions. 22 new tests across cloud-storage and sync modules. ADR-002 documents architecture. (#2)
- **Shareable Read-Only Links**: Dedicated `/share` route renders decisions in a clean, presentation-ready read-only view. Compact share encoding (single-char keys, index-based scores) produces 30–50% shorter URLs vs raw format. Rankings, score breakdown table, sensitivity analysis, and top drivers displayed. Mobile-friendly, embed-friendly (no auth required). 23 share serialization tests (#4)
- **Monte Carlo Sensitivity Engine**: Stochastic simulation engine with configurable iterations (1k–50k), perturbation range (±5%–50%), and distributions (uniform/normal/triangular). Seeded PRNG (xoshiro128\*\*) for reproducible results. Win probabilities, score distributions (mean, stddev, percentiles), confidence intervals, mini histograms. 5th tab ("Monte Carlo") with interactive config panel and rich results display. Pure engine in `monte-carlo.ts`. 38 Monte Carlo unit tests (#3)
- **Decision Comparison Mode**: Side-by-side decision comparison with divergence analysis. 4th tab ("Compare") with dual selector dropdowns, agreement score (Spearman's rank correlation), side-by-side rankings with rank/score deltas, divergence heatmap with green/yellow/red severity, weight comparison table. Pure comparison engine in `comparison.ts`. 33 comparison unit tests (#12)
- **JSON/CSV Import**: Import decisions from JSON files (full Decision or results export format) and CSV spreadsheets with preview step. File picker + drag-and-drop support. Lightweight CSV parser (no dependencies). 30 import unit tests. Import button in Header toolbar (#11)
- **Error Telemetry**: Production error reporter with localStorage diagnostics (max 20 errors, FIFO). Sentry forwarding wired (activates when @sentry/nextjs is loaded). ErrorBoundary now reports via `reportError()`. No PII captured. 9 error reporter unit tests (#40)
- **Visual Regression Testing**: Playwright visual comparison tests (7 screenshot tests: builder, results, sensitivity, dark mode, empty state, mobile, import modal). Uses `toHaveScreenshot()` with 1-2% tolerance. Only Chromium for consistent rendering. Snapshot workflow documented in CONTRIBUTING.md (#46)
- **Undo/Redo system**: Full undo/redo with 50-entry history stack, Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts, Undo/Redo toolbar buttons in Builder, toast notifications on destructive removals with Undo action (#8)
- **Decision Templates**: 8 pre-built templates (Job Offer, Vendor, Apartment, Investment, College, Hiring, Feature Prioritization, Relocation), template picker modal, one-click instantiation via Header (#10)
- **Component Test Suite**: 126 tests across 11 files — DecisionProvider (18 tests), Header (7), DecisionBuilder (11), ResultsView (8), ThemeProvider (5), ErrorBoundary (4), storage (11), utils (12), templates (10), scoring (27), validation (13). Custom `renderWithProviders` helper. `@testing-library/user-event` for realistic interactions (#7)
- **Toast notification system**: Imperative `showToast()` with auto-dismiss (3s), hover-to-pause, action buttons, max 5 stack, slide-up animation (#8)
- **Automated a11y testing**: axe-core Playwright E2E tests scan Builder, Results, Sensitivity, shortcuts modal, dark mode, and new decisions for WCAG 2.1 AA violations (#42)
- **Real-time validation feedback**: `useValidation` hook surfaces errors/warnings/infos inline in Builder; red badge on Builder tab shows error count; Results tab shows guard for blocking errors and yellow banner for warnings (#9)
- **Lazy-loaded ScoreChart**: Recharts component lazy-loaded via `React.lazy` + `Suspense` to reduce initial bundle size (#13)
- **React.memo on Header & ScoreChart**: Prevents unnecessary re-renders when parent state changes (#13)
- **Keyboard grid navigation**: Arrow keys navigate the score matrix cells; arrow up/down/left/right moves focus between inputs with auto-select (#25)
- **Loading skeleton**: Pulsing placeholder skeleton shown during decision switching for smoother transitions (#45)
- **Lighthouse CI**: `lighthouserc.json` config with performance ≥ 85, accessibility ≥ 90 thresholds; new CI job runs 3 Lighthouse audits per deploy (#44)

### Fixed

- **ARIA tab-panel linkage**: Tab buttons now have proper `id` attributes matching `aria-labelledby` on panels; roving tabindex with arrow-key + Home/End navigation (#17)
- **Modal focus trap**: Keyboard shortcuts modal traps Tab/Shift+Tab, focuses close button on open, restores focus on close (#17)
- **Runtime schema validation**: Type guard functions (`isDecision`, `isOption`, `isCriterion`, `isDecisionArray`) replace unsafe `as T` casts on localStorage and URL decode (#21)
- **Score clamping**: Score inputs clamped to 0–10 integer range in `updateScore` (#21)
- **E2E assertion mismatch**: New decisions now use "Untitled Decision" matching E2E test expectations (#6)
- **Shared URL restoration**: Visiting a share link now correctly restores the decision state (#5)
- **localStorage safety**: All localStorage calls wrapped in try/catch for private browsing compatibility (#16)
- **Double-rounding in scoring**: Total score now computed from unrounded weighted scores, preventing ranking inversions (#23)
- **Orphaned types**: `SensitivityAnalysis` and `SensitivityPoint` types now used by scoring engine (#31)
- **Dark mode FOUC**: Inline script prevents flash of light mode on dark-mode-enabled browsers (#26)
- **Dark mode coverage**: Full dark mode support across DecisionBuilder, SensitivityView, and ResultsView (#18)
- **Winner badge dark mode**: Winner badge in ResultsView now visible in dark mode
- **Option label overflow**: Options beyond Z now use AA, AB, ... labels (#22)

### Added

- **aria-describedby on inputs**: Score, weight, and sensitivity slider inputs now have screen-reader-visible range descriptions (#41)
- **aria-live announcer**: `AnnouncerProvider` + `useAnnounce()` hook announces CRUD operations, tab switches, and auto-save to screen readers (#29)
- **PWA web app manifest**: `manifest.ts` with app name, icons, standalone display mode, and theme color (#36)
- **Decision timestamps**: Created/updated `<time>` elements with relative formatting (`formatRelativeTime`) in Decision Builder; `updatedAt` auto-set on every edit (#43)
- **Print stylesheet**: Expanded `@media print` rules — all tab panels visible, nav/footer/buttons hidden, light palette forced, page-break-avoid on sections, link URLs shown (#24)
- **Cross-browser E2E**: Playwright config now includes Chromium, Firefox, and WebKit projects; CI installs all three browsers (#37)
- **HTTP security headers**: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (#20)
- **CI format:check step**: Prettier formatting enforced in CI pipeline (#30)
- **Dependabot config**: Automated dependency updates for npm and GitHub Actions (#32)
- **Coverage thresholds**: V8 coverage with 80% statement/function/line thresholds (#38)
- **CODEOWNERS file**: Auto-assigns reviewers for PRs (#34)
- **robots.txt + sitemap.xml**: SEO improvements for search engine indexing (#35)
- **Dynamic footer version**: Footer version derived from package.json (#39)
- **Confirmation dialogs**: Delete and reset actions now require user confirmation (#19)
- **Input limits**: maxLength on text inputs to prevent excessive data (#27)

### Changed

- **next/image for logo**: Logo in header now uses Next.js Image component for optimization (#28)
- **Removed dead code**: Removed unused `cn()`, `printRef`, `class-variance-authority`, `clsx`, `tailwind-merge` (#15)

## [0.1.0] - 2026-02-25

### Added

- **Decision Builder**: Create decisions with title, description, options, and criteria
- **Scoring Engine**: Deterministic weighted-sum scoring model with benefit/cost criteria
- **Results View**: Ranked options with score breakdown, top drivers, and explanation
- **Sensitivity Analysis**: Weight-swing analysis showing how robust the winner is
- **Data Persistence**: LocalStorage-based persistence with auto-save
- **Demo Decision**: Preloaded "Best City to Relocate To" example
- **Export**: JSON export of decision data and results
- **Share**: URL-based sharing (base64 encoded state)
- **Accessibility**: Keyboard navigation, ARIA labels, semantic HTML
- **Documentation**: Architecture, scoring model, data sources, roadmap, ADRs
- **CI/CD**: GitHub Actions workflow for lint, test, typecheck, and build
- **Repo Hygiene**: README, LICENSE (MIT), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, PR/issue templates
