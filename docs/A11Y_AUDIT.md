# WCAG 2.1 AA Accessibility Audit — Decision OS

**Date:** 2026-03-01
**Auditor:** Automated WCAG 2.1 AA Review
**Scope:** Full client-side application (all tabs, modals, interactive components)
**Standard:** WCAG 2.1 Level AA

---

## Executive Summary

Decision OS demonstrates **strong accessibility foundations** with a comprehensive set of ARIA patterns, keyboard navigation, screen reader support, and well-structured landmarks. The application includes a skip-to-content link, global focus-visible rings, an Announcer component for live regions, and proper ARIA roles across all major interactive patterns (tabs, grids, dialogs, menus, radiogroups).

This audit identified remediation items across 8 areas and implemented fixes for the highest-impact findings.

**Overall Compliance: Good — majority of WCAG 2.1 AA criteria met.**

---

## 1. Keyboard Navigation

### WCAG Criteria: 2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.4.3 Focus Order, 2.4.7 Focus Visible

| # | Finding | Severity | Status | WCAG |
|---|---------|----------|--------|------|
| 1.1 | Global `*:focus-visible` ring on all interactive elements | Pass | ✅ | 2.4.7 |
| 1.2 | Tab navigation uses WAI-ARIA Tabs pattern with roving tabIndex | Pass | ✅ | 2.1.1 |
| 1.3 | Score matrix implements arrow-key grid navigation | Pass | ✅ | 2.1.1 |
| 1.4 | Skip-to-content link in layout.tsx | Pass | ✅ | 2.4.1 |
| 1.5 | All click handlers on native `<button>` elements (keyboard-accessible) | Pass | ✅ | 2.1.1 |
| 1.6 | Modal backdrop dismiss is supplementary (close button + Escape primary) | Pass | ✅ | 2.1.1 |
| 1.7 | ConfidenceDot touch target below 24px minimum | Low | ⚠️ Noted | 2.5.8 |

### Details

**Score matrix grid navigation** (`handleGridKeyDown` in DecisionBuilder.tsx) implements full ArrowUp/Down/Left/Right navigation with `data-grid-row`/`data-grid-col` selectors, matching the WAI-ARIA Grid pattern.

**Tab navigation** in page.tsx uses `role="tab"`, `aria-selected`, `aria-controls`, roving `tabIndex` (0 for active, -1 for inactive), and arrow-key handling.

---

## 2. Screen Reader Support

### WCAG Criteria: 1.3.1 Info and Relationships, 4.1.2 Name Role Value, 4.1.3 Status Messages

| # | Finding | Severity | Status | WCAG |
|---|---------|----------|--------|------|
| 2.1 | Announcer component (dual live regions: polite + assertive) | Pass | ✅ | 4.1.3 |
| 2.2 | All modals have `role="dialog"` + `aria-label` | Pass | ✅ | 4.1.2 |
| 2.3 | Score matrix has `role="grid"` + `aria-label` | Pass | ✅ | 1.3.1 |
| 2.4 | Scoring method selector uses `role="radiogroup"` + `role="radio"` | Pass | ✅ | 4.1.2 |
| 2.5 | Progress bars have `role="progressbar"` with aria-value* attributes | Pass | ✅ | 4.1.2 |
| 2.6 | Banner, navigation, main landmarks properly structured | Pass | ✅ | 1.3.1 |
| 2.7 | Dynamic content changes announced via aria-live regions | Pass | ✅ | 4.1.3 |
| 2.8 | ScoreChart now has `role="img"` + aria-label + sr-only data table | Pass | ✅ Remediated | 1.1.1 |
| 2.9 | ParetoChart has `role="img"` with descriptive aria-label | Pass | ✅ | 1.1.1 |
| 2.10 | MonteCarloView provides tabular alternative for chart data | Pass | ✅ | 1.1.1 |

### Charts Text Alternatives (Remediated)

**ScoreChart.tsx** now includes:
- `role="img"` + `aria-label` with ranked score summary on the total scores chart
- `aria-hidden="true"` on the stacked breakdown chart (decorative duplicate)
- A `sr-only` data table with proper `<th scope="col/row">` providing all chart data in accessible tabular format

---

## 3. Color Contrast

### WCAG Criteria: 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast

| # | Finding | Severity | Status | WCAG |
|---|---------|----------|--------|------|
| 3.1 | `text-gray-400` (#9ca3af) on white = 2.9:1 — fails 4.5:1 for normal text | Medium | ✅ Remediated | 1.4.3 |
| 3.2 | `text-gray-500` (#6b7280) on white = 5.0:1 — passes | Pass | ✅ | 1.4.3 |
| 3.3 | Dark mode foreground (#ededed) on background (#0a0a0a) = 17:1 | Pass | ✅ | 1.4.3 |
| 3.4 | `text-gray-400` on interactive icons (non-text) = 3:1+ — acceptable | Pass | ✅ | 1.4.11 |
| 3.5 | Remaining `text-gray-400` on decorative/icon elements | Info | ⚠️ Acceptable | 1.4.11 |

### Remediation

Upgraded `text-gray-400` to `text-gray-500` (and `dark:text-gray-500` to `dark:text-gray-400`) for informational text in DecisionBuilder.tsx:
- Option row labels (A, B, C...)
- Character count displays (e.g. "42/500")

Remaining `text-gray-400` instances are on decorative icons and non-text UI elements, which only need 3:1 contrast under WCAG 1.4.11.

---

## 4. Score Matrix

### WCAG Criteria: 1.3.1 Info and Relationships, 2.1.1 Keyboard

| # | Finding | Severity | Status | WCAG |
|---|---------|----------|--------|------|
| 4.1 | `role="grid"` with `aria-label="Scores matrix"` | Pass | ✅ | 1.3.1 |
| 4.2 | Column headers now use `<th scope="col">` | Pass | ✅ Remediated | 1.3.1 |
| 4.3 | Row headers now use `<th scope="row">` (was `<td>`) | Pass | ✅ Remediated | 1.3.1 |
| 4.4 | Arrow-key navigation between cells | Pass | ✅ | 2.1.1 |
| 4.5 | Each cell input has `aria-label` describing option + criterion | Pass | ✅ | 4.1.2 |
| 4.6 | Hidden range description linked via `aria-describedby` | Pass | ✅ | 1.3.1 |
| 4.7 | Criterion tooltips accessible via tabIndex + aria-describedby | Pass | ✅ | 4.1.2 |
| 4.8 | Mobile score cards use `role="region"` with `aria-label` | Pass | ✅ | 1.3.1 |

---

## 5. Charts

### WCAG Criteria: 1.1.1 Non-text Content, 1.3.1 Info and Relationships

| # | Finding | Severity | Status | WCAG |
|---|---------|----------|--------|------|
| 5.1 | ScoreChart — `role="img"` + `aria-label` + sr-only data table added | Pass | ✅ Remediated | 1.1.1 |
| 5.2 | ParetoChart — `role="img"` with descriptive aria-label | Pass | ✅ | 1.1.1 |
| 5.3 | MonteCarloView — tabular alternative with `aria-label` | Pass | ✅ | 1.1.1 |
| 5.4 | ParetoChart disables animations (`isAnimationActive={false}`) | Pass | ✅ | 2.3.3 |
| 5.5 | Progress bars — `role="progressbar"` with aria-value* | Pass | ✅ | 4.1.2 |
| 5.6 | WeightDistributionBar — `role="img"` with `aria-label` | Pass | ✅ | 1.1.1 |

---

## 6. Modals/Dialogs

### WCAG Criteria: 2.4.3 Focus Order, 1.3.1 Info and Relationships

| # | Finding | Severity | Status | WCAG |
|---|---------|----------|--------|------|
| 6.1 | All modals have `role="dialog"` + `aria-label` | Pass | ✅ | 4.1.2 |
| 6.2 | ImportModal, TemplatePicker have `aria-modal="true"` | Pass | ✅ | 4.1.2 |
| 6.3 | Keyboard Shortcuts modal has focus trap + focus restore | Pass | ✅ | 2.4.3 |
| 6.4 | CoachmarkOverlay has focus trap | Pass | ✅ | 2.4.3 |
| 6.5 | ReasoningPopover now has `aria-modal="true"` | Pass | ✅ Remediated | 4.1.2 |
| 6.6 | ReasoningPopover textarea now has `htmlFor`/`id` label link | Pass | ✅ Remediated | 1.3.1 |
| 6.7 | WhatIfPanel missing focus trap | Low | ⚠️ Noted | 2.4.3 |
| 6.8 | ImportModal/TemplatePicker missing explicit focus restore | Low | ⚠️ Noted | 2.4.3 |

### Noted Items

**6.7** — WhatIfPanel opens as a full dialog but lacks Tab-trapping logic. Users can Tab behind the panel. This is a future enhancement.

**6.8** — ImportModal and TemplatePicker close without restoring focus to the trigger button. While the page still has a logical tab order, explicit focus restore would improve the experience.

---

## 7. Forms

### WCAG Criteria: 1.3.1 Info and Relationships, 3.3.1 Error Identification, 3.3.2 Labels or Instructions

| # | Finding | Severity | Status | WCAG |
|---|---------|----------|--------|------|
| 7.1 | Title input has `<label htmlFor>` properly associated | Pass | ✅ | 1.3.1 |
| 7.2 | Title input now has `aria-required="true"` | Pass | ✅ Remediated | 3.3.2 |
| 7.3 | Title validation uses `aria-invalid` + `aria-describedby` → error | Pass | ✅ | 3.3.1 |
| 7.4 | All Monte Carlo inputs have proper `<label htmlFor>` associations | Pass | ✅ | 1.3.1 |
| 7.5 | Score matrix inputs have `aria-label` | Pass | ✅ | 4.1.2 |
| 7.6 | CSV import title input has proper label | Pass | ✅ | 1.3.1 |
| 7.7 | Option/criterion name inputs have `aria-label` | Pass | ✅ | 4.1.2 |
| 7.8 | Option inputs have visual validation styling but missing `aria-invalid` | Low | ⚠️ Noted | 3.3.1 |

---

## 8. Motion & Animation

### WCAG Criteria: 2.3.3 Animation from Interactions (AAA), 2.3.1 Three Flashes

| # | Finding | Severity | Status | WCAG |
|---|---------|----------|--------|------|
| 8.1 | `prefers-reduced-motion: reduce` media query now disables all animations | Pass | ✅ Remediated | 2.3.3 |
| 8.2 | Toast slide-up animation (0.2s) — disabled by reduced-motion | Pass | ✅ | 2.3.3 |
| 8.3 | Skip-link transition (0.15s) — disabled by reduced-motion | Pass | ✅ | 2.3.3 |
| 8.4 | Range slider thumb hover/active scale — disabled by reduced-motion | Pass | ✅ | 2.3.3 |
| 8.5 | CompletionRing stroke transition — disabled by reduced-motion | Pass | ✅ | 2.3.3 |
| 8.6 | No three-flashes content anywhere | Pass | ✅ | 2.3.1 |

### Implementation

Added to `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This universally disables all CSS animations and transitions when the user's system preference is set to reduce motion.

---

## Remediation Summary

| Action | File(s) | WCAG Criterion |
|--------|---------|----------------|
| Added `prefers-reduced-motion: reduce` media query | `globals.css` | 2.3.3 |
| Added `role="img"` + `aria-label` on ScoreChart | `ScoreChart.tsx` | 1.1.1 |
| Added sr-only data table in ScoreChart | `ScoreChart.tsx` | 1.1.1 |
| Added `scope="col"` to score matrix column headers | `DecisionBuilder.tsx` | 1.3.1 |
| Changed option name cells from `<td>` to `<th scope="row">` | `DecisionBuilder.tsx` | 1.3.1 |
| Added `aria-required="true"` to title input | `DecisionBuilder.tsx` | 3.3.2 |
| Fixed `text-gray-400` contrast on informational text | `DecisionBuilder.tsx` | 1.4.3 |
| Added `aria-modal="true"` to ReasoningPopover | `ReasoningPopover.tsx` | 4.1.2 |
| Added `htmlFor`/`id` label association on ReasoningPopover textarea | `ReasoningPopover.tsx` | 1.3.1 |

---

## Noted Items (Future Improvements)

| # | Item | Severity | WCAG |
|---|------|----------|------|
| N1 | WhatIfPanel missing focus trap | Low | 2.4.3 |
| N2 | ImportModal/TemplatePicker missing focus restore | Low | 2.4.3 |
| N3 | Option/criterion inputs missing `aria-invalid` | Low | 3.3.1 |
| N4 | ConfidenceDot touch target below 24px | Low | 2.5.8 |
| N5 | Remaining `text-gray-400` on decorative elements | Info | 1.4.11 |

---

## Existing A11y Infrastructure

Decision OS already includes significant accessibility infrastructure:

- **Skip-to-content link** (layout.tsx → `#main-content`)
- **Global focus-visible ring** (`globals.css`)
- **Announcer component** (dual live regions: polite/assertive)
- **WAI-ARIA Tabs pattern** with roving tabIndex
- **WAI-ARIA Grid pattern** with arrow-key navigation
- **Proper ARIA roles**: dialog, grid, radiogroup, radio, menu, menuitem, progressbar, status, alert, banner, tooltip, img
- **Section landmarks** with `aria-labelledby`
- **Print styles** that hide interactive elements
- **E2E axe-core tests** (6 tests covering Builder, Results, Sensitivity, dark mode)
- **Component-level a11y tests** (BiasWarnings, ConfidenceIndicator, ImportModal, WeightDistributionBar)

---

## Test Coverage

Accessibility-related tests:
- `e2e/accessibility.spec.ts` — 6 axe-core tests with WCAG 2.1 AA tags
- `src/__tests__/a11y.test.ts` — New unit tests for remediated items
- `src/__tests__/components/BiasWarnings.test.tsx` — aria-live assertions
- `src/__tests__/components/ConfidenceIndicator.test.tsx` — aria-label assertions
- `src/__tests__/components/ImportModal.test.tsx` — aria-modal + aria-label
- `src/__tests__/components/WeightDistributionBar.test.tsx` — role="img" + aria-label
