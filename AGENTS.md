# DecisionOS Codex guidance

Read `README.md`, `docs/ARCHITECTURE.md`, and `docs/SCORING_MODEL.md` before
changing decision logic. Preserve deterministic scoring and the documented
client-side, zero-account, zero-data-collection product boundary.

## Tool path

- Use npm with the committed lockfile and the repository-local Next.js,
  TypeScript, Vitest, and Playwright tools.
- Browser/DevTools and Vercel inspection are on-demand for UI, performance, or
  deployment evidence. Provider reads may run automatically; deployments,
  environment/configuration changes, and other writes require confirmation.
- Do not assume the retained `supabase/` material is an active backend or mutate
  it without a task that first reconciles it with the documented architecture.
- Do not add Supabase MCP, generic code-indexing MCPs, or new hosted services by
  default.

## Verification

```powershell
npm ci
npm run check:all
npm run build
```

Run `npm run test:e2e` for browser-visible or interaction changes. Report the
exact checks run and do not infer production deployment from local success.
