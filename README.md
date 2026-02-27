<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/banner.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/banner.svg">
  <img alt="Decision OS — Structured decision-making for humans who think clearly" src="docs/banner.png" width="100%">
</picture>

<br/>

**Elite decision intelligence platform — make better decisions with science, not gut feelings.**

<br/>

[![CI](https://github.com/ericsocrat/decision-os/actions/workflows/ci.yml/badge.svg)](https://github.com/ericsocrat/decision-os/actions/workflows/ci.yml)
[![Deploy](https://img.shields.io/badge/Vercel-deployed-brightgreen?logo=vercel)](https://decision-os-hazel.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](tsconfig.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[**Live Demo →**](https://decision-os-hazel.vercel.app) · [Docs](docs/) · [Scoring Model](docs/SCORING_MODEL.md) · [Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Contributing](CONTRIBUTING.md)

</div>

---

## What is Decision OS?

Decision OS is a **multi-criteria decision analysis (MCDA)** platform that transforms gut-feel choices into structured, data-driven decisions. It implements a deterministic weighted-sum scoring model with sensitivity analysis — backed by decades of decision science research. Everything runs client-side in your browser with zero accounts, zero backend, and zero data collection.

## Quick Start

```bash
git clone https://github.com/ericsocrat/decision-os.git
cd decision-os && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — a demo decision is preloaded so you can explore immediately.

## Screenshots

> **To add real screenshots:** Open [https://decision-os-hazel.vercel.app](https://decision-os-hazel.vercel.app), take screenshots of each tab (Builder, Results, Sensitivity), save them as `docs/screenshots/builder.png`, `docs/screenshots/results.png`, `docs/screenshots/sensitivity.png`, and update the paths below.

|             Decision Builder             |                 Results                  |               Sensitivity Analysis               |
| :--------------------------------------: | :--------------------------------------: | :----------------------------------------------: |
| ![Builder](docs/screenshots/builder.png) | ![Results](docs/screenshots/results.png) | ![Sensitivity](docs/screenshots/sensitivity.png) |

## Features

| Status | Feature                       | Description                                              |
| ------ | ----------------------------- | -------------------------------------------------------- |
| ✅     | **Decision Builder**          | Title, options, weighted criteria, scores matrix         |
| ✅     | **Real-time Results**         | Ranked options with visual score bars and breakdowns     |
| ✅     | **Top Drivers**               | See which criteria matter most                           |
| ✅     | **Sensitivity Analysis**      | Test if weight changes flip the winner (±5%–50%)         |
| ✅     | **TOPSIS Algorithm**          | Alternative ranking via ideal/anti-ideal distance        |
| ✅     | **Minimax Regret**            | Rank by worst-case regret across criteria                |
| ✅     | **Monte Carlo Simulation**    | 10k-run probabilistic sensitivity analysis               |
| ✅     | **Framework Comparison**      | Side-by-side WSM / TOPSIS / Regret with consensus engine |
| ✅     | **Score Confidence**          | Per-cell high/medium/low confidence with scoring impact  |
| ✅     | **Bias Detection**            | Detects central tendency, anchoring, and optimism bias   |
| ✅     | **AHP Wizard**                | Pairwise comparison to derive criteria weights           |
| ✅     | **Reasoning Notes**           | Per-score justification journal                          |
| ✅     | **Drag-and-Drop**             | Reorder options and criteria with keyboard support       |
| ✅     | **JSON/CSV Import**           | Import decisions with preview and validation             |
| ✅     | **JSON Export & URL Sharing** | Download data or copy a shareable link                   |
| ✅     | **Decision Comparison**       | Side-by-side comparison of multiple decisions            |
| ✅     | **Multiple Decisions**        | Save and switch between decisions                        |
| ✅     | **8 Decision Templates**      | Job Offer, Vendor, Apartment, Investment, and more       |
| ✅     | **Undo/Redo**                 | 50-entry history with Ctrl+Z/Ctrl+Shift+Z                |
| ✅     | **Dark Mode**                 | System-aware with FOUC prevention                        |
| ✅     | **Charts**                    | Recharts-powered bar and breakdown charts                |
| ✅     | **Cloud Sync**                | Bidirectional Supabase sync with auth                    |
| ✅     | **Accessible**                | Keyboard navigable, ARIA labels, screen reader support   |
| ✅     | **1,375 Tests**               | Comprehensive unit + E2E + a11y test suite               |

## Scoring Model

Decision OS uses a **Weighted Sum Model (WSM)**:

$$T_j = \sum_{i=1}^{n} \hat{w}_i \times e_{j,i}$$

Where $\hat{w}_i$ is the normalized weight and $e_{j,i}$ is the effective score (adjusted for benefit/cost criteria).

See [docs/SCORING_MODEL.md](docs/SCORING_MODEL.md) for the full mathematical specification, and [docs/DECISION_FRAMEWORKS.md](docs/DECISION_FRAMEWORKS.md) for all implemented and planned algorithms.

## Architecture Overview

```
Browser (Client)
├── UI Layer (React Components)
│   ├── DecisionBuilder  — Option/criteria/score editing + drag-and-drop
│   ├── ResultsView      — Rankings and visualizations
│   ├── SensitivityView  — Weight-swing robustness testing
│   ├── MonteCarloView   — Probabilistic simulation results
│   ├── CompareView      — Side-by-side decision comparison
│   └── FrameworkComparison — WSM/TOPSIS/Regret consensus
├── State Layer (React Context + DecisionProvider)
│   ├── 4 focused contexts + 1 backward-compatible context
│   ├── Undo/redo with coalescing middleware
│   └── Auto-save to localStorage (300ms debounce)
├── Logic Layer (Pure Functions)
│   ├── scoring.ts       — Deterministic WSM engine
│   ├── topsis.ts        — TOPSIS ideal-distance ranking
│   ├── regret.ts        — Minimax Regret analysis
│   ├── monte-carlo.ts   — 10k-run probabilistic simulation
│   ├── consensus.ts     — Multi-framework agreement engine
│   ├── bias-detection.ts — Cognitive bias detection
│   ├── validation.ts    — Input validation
│   └── templates.ts     — 8 pre-built decision templates
└── Cloud Layer (Optional)
    ├── supabase.ts      — Auth + real-time subscriptions
    ├── cloud-storage.ts — CRUD operations
    └── sync.ts          — Bidirectional sync engine
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design.

## Tech Stack

| Layer       | Technology                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Framework   | [Next.js 16](https://nextjs.org/) (App Router, Turbopack)                                                      |
| Language    | [TypeScript](https://www.typescriptlang.org/) (strict mode)                                                    |
| Styling     | [Tailwind CSS 4](https://tailwindcss.com/)                                                                     |
| Charts      | [Recharts](https://recharts.org/) (lazy-loaded)                                                                |
| Drag & Drop | [@dnd-kit](https://dndkit.com/) (accessible, keyboard-navigable)                                               |
| Testing     | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) + [axe-core](https://www.deque.com/axe/) |
| CI/CD       | [GitHub Actions](.github/workflows/ci.yml)                                                                     |
| Persistence | localStorage (client-side) + optional [Supabase](https://supabase.com/) cloud sync                             |
| Deployment  | [Vercel](https://vercel.com/)                                                                                  |

## Commands

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `npm run dev`           | Start development server          |
| `npm run build`         | Production build                  |
| `npm run lint`          | Lint with ESLint (zero-tolerance) |
| `npm run typecheck`     | TypeScript strict mode check      |
| `npm run test`          | Run unit tests (Vitest)           |
| `npm run test:coverage` | Tests with coverage report        |
| `npm run test:e2e`      | E2E tests (Playwright)            |
| `npm run format`        | Format with Prettier              |

## Deployment

Deployed at **[decision-os-hazel.vercel.app](https://decision-os-hazel.vercel.app)**.

Deploy your own:

1. Fork this repository
2. Import at [vercel.com/new](https://vercel.com/new)
3. Click **Deploy** — zero configuration needed

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full deployment guide.

## Documentation

| Document                                           | Description                              |
| -------------------------------------------------- | ---------------------------------------- |
| [Architecture](docs/ARCHITECTURE.md)               | System design and module boundaries      |
| [Scoring Model](docs/SCORING_MODEL.md)             | Mathematical specification with examples |
| [Decision Frameworks](docs/DECISION_FRAMEWORKS.md) | All algorithms with math foundations     |
| [CI Architecture](docs/CI_ARCHITECTURE.md)         | CI/CD pipeline design and workflows      |
| [Governance](docs/GOVERNANCE.md)                   | Decision-making process and roles        |
| [Monitoring](docs/MONITORING.md)                   | Performance budgets and health metrics   |
| [Labels](docs/LABELS.md)                           | Issue/PR label taxonomy                  |
| [Roadmap](docs/ROADMAP.md)                         | Feature roadmap by version               |
| [ADRs](docs/DECISIONS/)                            | Architecture Decision Records            |
| [Data Sources](docs/DATA_SOURCES.md)               | Data provenance policy                   |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Setup instructions
- Development workflow
- Code style guide
- Commit message format
- How to add a new decision algorithm
- How to add a new UI component

Key rules:

- Don't break the deterministic scoring engine
- All changes need tests
- Run `npm run test && npm run lint && npm run typecheck && npm run build` before submitting

## License

[MIT](LICENSE) — free for personal and commercial use.

---

<div align="center">
  <sub>Built with ❤️ by engineers who make better decisions.</sub>
</div>
