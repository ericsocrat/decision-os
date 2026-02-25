<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/banner.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/banner.svg">
  <img alt="Decision OS — Structured decision-making for humans who think clearly" src="docs/banner.png" width="100%">
</picture>

<br/>

[![CI](https://github.com/ericsocrat/decision-os/actions/workflows/ci.yml/badge.svg)](https://github.com/ericsocrat/decision-os/actions)
[![Deploy](https://img.shields.io/badge/Vercel-deployed-brightgreen?logo=vercel)](https://decision-os-app.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](tsconfig.json)

[**Live Demo →**](https://decision-os-app.vercel.app) · [Scoring Model](docs/SCORING_MODEL.md) · [Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md)

</div>

---

## What is Decision OS?

Decision OS is a **multi-criteria decision analysis (MCDA)** tool that helps you make structured decisions. Instead of gut feelings or endless pros/cons lists, you:

1. **Define options** (A, B, C…)
2. **Set criteria** with weights (0–100) and types (benefit/cost)
3. **Score each option** per criterion (0–10)
4. **See results** — ranked options with score breakdowns and top drivers
5. **Run sensitivity analysis** — test if small weight changes flip the winner

No accounts. No backend. Everything stays in your browser.

## Screenshots

> **To add real screenshots:** Open [https://decision-os-app.vercel.app](https://decision-os-app.vercel.app), take screenshots of each tab (Builder, Results, Sensitivity), save them as `docs/screenshots/builder.png`, `docs/screenshots/results.png`, `docs/screenshots/sensitivity.png`, and update the paths below.

| Decision Builder | Results | Sensitivity Analysis |
|:---:|:---:|:---:|
| ![Builder](docs/screenshots/builder.png) | ![Results](docs/screenshots/results.png) | ![Sensitivity](docs/screenshots/sensitivity.png) |

## 30-Second Demo Walkthrough

1. **Open** [decision-os-app.vercel.app](https://decision-os-app.vercel.app) — a demo decision loads instantly
2. **Explore the Builder** — see 3 cities scored across 5 criteria with weights
3. **Switch to Results** — Austin wins at 6.62; see the per-criterion breakdown
4. **Check Sensitivity** — discover the winner stays robust across ±25% weight swings
5. **Edit a score** — change any cell and watch results update in real-time
6. **Export** — click JSON Export or copy a shareable URL
7. **Reload the page** — your changes persisted automatically via localStorage

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

### Install & Run

```bash
git clone https://github.com/ericsocrat/decision-os.git
cd decision-os
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — a demo decision is preloaded so you can explore immediately.

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run format` | Format with Prettier |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict mode) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Testing | [Vitest](https://vitest.dev/) + React Testing Library |
| CI/CD | [GitHub Actions](.github/workflows/ci.yml) |
| Persistence | localStorage (client-side) |
| Deployment | [Vercel](https://vercel.com/) |

## Architecture

```
src/
├── app/              # Next.js pages (App Router)
├── components/       # React UI components
│   ├── DecisionProvider.tsx  # State management (Context)
│   ├── DecisionBuilder.tsx   # Options, criteria, scores editor
│   ├── ResultsView.tsx       # Rankings, breakdowns, exports
│   └── SensitivityView.tsx   # Weight-swing analysis
├── lib/              # Pure logic (no React, fully testable)
│   ├── types.ts      # Domain type definitions
│   ├── scoring.ts    # Deterministic scoring engine
│   ├── validation.ts # Input validation
│   ├── storage.ts    # localStorage persistence
│   └── demo-data.ts  # Preloaded demo decision
└── __tests__/        # Unit tests (40+ tests)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design.

## Scoring Model

Decision OS uses a **Weighted Sum Model**:

1. **Normalize weights** so they sum to 1.0
2. **Compute effective scores**: benefit = raw score, cost = 10 − raw score
3. **Total score** = Σ(normalized_weight × effective_score)
4. **Rank** options by total score (descending)

### Example

| Option | Price (cost, w=40) | Performance (benefit, w=35) | Portability (benefit, w=25) | **Total** |
|--------|:--:|:--:|:--:|:--:|
| MacBook Pro | 8 → eff: 2 | 9 | 7 | **5.70** |
| ThinkPad X1 | 5 → eff: 5 | 7 | 8 | **6.45** ✓ |

See [docs/SCORING_MODEL.md](docs/SCORING_MODEL.md) for the full specification with formulas.

## Features

- ✅ **Decision Builder** — Title, options, weighted criteria, scores matrix
- ✅ **Real-time Results** — Ranked options with visual score bars and breakdowns
- ✅ **Top Drivers** — See which criteria matter most
- ✅ **Sensitivity Analysis** — Test if weight changes flip the winner (±5%–50% swing)
- ✅ **Explain Results** — Clear explanation of how scores were computed
- ✅ **JSON Export** — Download decision data and results
- ✅ **URL Sharing** — Copy shareable link with encoded state
- ✅ **Multiple Decisions** — Save and switch between decisions
- ✅ **Demo Decision** — Preloaded example for instant exploration
- ✅ **Accessible** — Keyboard navigable, ARIA labels, semantic HTML
- ✅ **Mobile Friendly** — Responsive design, works on all screen sizes
- ✅ **No Backend** — Everything runs in your browser (localStorage)

## Deployment

Decision OS is deployed at **[decision-os-app.vercel.app](https://decision-os-app.vercel.app)**.

To deploy your own instance:

1. Fork this repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub fork
4. Click **Deploy** (zero configuration needed — Next.js auto-detected)
5. Your app is live!

Or via Vercel CLI:

```bash
npx vercel --prod
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full deployment guide, branch protection setup, and release workflow.

## Testing

```bash
npm run test           # Run all 40+ unit tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

Tests cover:
- Weight normalization (including edge cases)
- Effective score calculation (benefit + cost)
- Full decision scoring and ranking
- Sensitivity analysis determinism
- Input validation
- Worked example from documentation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Key rules:

- Don't break the deterministic scoring engine
- All changes need tests
- Run `npm run test && npm run lint && npm run typecheck && npm run build` before submitting

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design and module boundaries |
| [Scoring Model](docs/SCORING_MODEL.md) | Mathematical specification with examples |
| [Data Sources](docs/DATA_SOURCES.md) | Data provenance policy (no scraping) |
| [Roadmap](docs/ROADMAP.md) | Feature roadmap by version |
| [ADRs](docs/DECISIONS/) | Architecture Decision Records |
| [Copilot Instructions](copilot-instructions.md) | AI agent coding conventions |

## LinkedIn Feature-Ready Pitch

> **I built Decision OS** — an open-source structured decision-making tool that replaces gut-feel choices with data-driven analysis. It implements a deterministic weighted-sum scoring model with sensitivity analysis, all running client-side in the browser. The project demonstrates production engineering practices: TypeScript strict mode, 40+ unit tests, CI/CD pipeline, comprehensive documentation, and clean architecture with a pure scoring engine separated from the UI layer. Built with Next.js, Tailwind CSS, and deployed on Vercel.
>
> **Try it live:** [decision-os-app.vercel.app](https://decision-os-app.vercel.app)
>
> **Source code:** [github.com/ericsocrat/decision-os](https://github.com/ericsocrat/decision-os)
>
> Every formula is documented. Every edge case is tested. Every architectural decision has an ADR.

## License

[MIT](LICENSE) — free for personal and commercial use.

---

<div align="center">
  <sub>Built with ❤️ by engineers who make better decisions.</sub>
</div>
