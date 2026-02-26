# Roadmap

## v0.1.0 — MVP (Current) ✅

- [x] Decision builder (title, options, criteria, scores)
- [x] Deterministic weighted-sum scoring engine
- [x] Results view with rankings and breakdown
- [x] Sensitivity analysis (weight swing)
- [x] LocalStorage persistence
- [x] Demo decision preloaded
- [x] JSON export
- [x] URL sharing (base64)
- [x] Accessibility (keyboard nav, ARIA)
- [x] CI/CD pipeline
- [x] Documentation

## v0.2.0 — Polish & UX

- [x] Dark mode (full dark theme with FOUC prevention)
- [x] Charts (Recharts bar + stacked breakdown)
- [x] URL sharing (lz-string compression with base64 fallback)
- [x] Keyboard shortcuts (1/2/3 tabs, ? help, arrow-key tabs, Home/End)
- [x] PDF export (via window.print)
- [x] Error boundary with recovery UI
- [x] Security headers (HSTS, X-Frame-Options, CSP, etc.)
- [x] Confirmation dialogs on destructive actions
- [x] Coverage thresholds in CI
- [x] Dependabot + CODEOWNERS
- [x] robots.txt + sitemap.xml
- [x] ARIA tab-panel linkage + roving tabindex + modal focus trap
- [x] Runtime schema validation (type guards for localStorage & URL decode)
- [x] aria-describedby on score, weight, and sensitivity inputs
- [x] aria-live announcer for CRUD operations and tab switches
- [x] PWA web app manifest
- [x] Decision timestamps (created/updated) with relative time display
- [x] Print stylesheet (all panels visible, clean layout)
- [x] Cross-browser E2E testing (Chromium + Firefox + WebKit)
- [x] Automated axe-core accessibility testing in E2E suite
- [x] Real-time validation feedback (inline errors/warnings in Builder, badge, Results guard)
- [x] Lazy-loaded ScoreChart + React.memo for performance
- [x] Score matrix keyboard grid navigation (arrow keys)
- [x] Loading skeleton during decision switching
- [x] Lighthouse CI with performance/accessibility thresholds
- [x] Decision templates (8 templates: career, purchase, hiring, etc.)
- [x] Undo/redo support (50-entry history, Ctrl+Z/Ctrl+Shift+Z, toolbar buttons)
- [x] Component test suite (236 tests across 15 files)
- [x] JSON/CSV import with preview and drag-and-drop
- [x] Production error telemetry (localStorage diagnostics, Sentry-ready)
- [x] Visual regression testing (Playwright screenshots, 7 visual tests)
- [ ] Drag-and-drop reordering for options/criteria
- [ ] Mobile-optimized score matrix (swipe or accordion)
- [ ] Tooltips for criterion descriptions

## v0.3.0 — Persistence & Sharing

- [ ] Supabase backend (behind feature flag)
- [ ] User accounts (optional)
- [ ] Shareable decision links (server-stored)
- [ ] Collaborative decision-making (real-time)
- [ ] Decision history / versioning

## v0.4.0 — Advanced Analysis

- [x] Monte Carlo sensitivity analysis
- [ ] "What-if" scenarios (compare two weight configurations)
- [ ] Decision journal (track outcomes over time)
- [ ] PDF export
- [x] Comparison mode (side-by-side decisions)

## v1.0.0 — Production Ready

- [ ] Performance optimization for large decisions (50+ options)
- [ ] i18n (internationalization)
- [ ] Comprehensive e2e test suite
- [ ] Security audit
- [ ] Accessibility audit (WCAG 2.1 AA)

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to help with roadmap items.
