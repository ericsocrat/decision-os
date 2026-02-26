# ADR-002: Cloud Sync with Supabase

## Status

Accepted

## Context

ADR-001 established localStorage as the MVP persistence layer, with Supabase planned for v0.3.0. Users need cross-device access, and data should not be lost if the browser cache is cleared.

## Decision

**Supabase** for authentication (OAuth) and cloud storage (PostgreSQL + RLS).

- **Auth**: Supabase Auth with GitHub and Google OAuth providers
- **Database**: `decisions` table with JSONB `data` column, RLS scoped to `auth.uid()`
- **Sync strategy**: Local-first with cloud sync; `updatedAt` last-write-wins conflict resolution
- **Feature flag**: Enabled when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

## Rationale

- **Supabase Auth + DB in one service**: Fewer moving parts vs. NextAuth + separate DB
- **Client-only integration**: No server components or middleware needed; Supabase JS client handles auth tokens in localStorage
- **Local-first preserved**: All reads/writes go to localStorage first, then sync to cloud
- **Graceful degradation**: App works fully offline; cloud sync is best-effort
- **RLS**: Row-level security ensures users only access their own data — no API-level authorization code needed

## Migration Path

1. User signs in via OAuth
2. `MigrationBanner` detects unmigrated localStorage decisions
3. User clicks "Upload Now" → batch upsert to cloud
4. Subsequent saves write to both localStorage and cloud
5. On load (when authenticated), cloud decisions are merged with local

## Consequences

- Requires a Supabase project for cloud features (free tier sufficient)
- Two sources of truth (local + cloud) with eventual consistency
- Self-hosted deployments need their own Supabase instance or env vars
- OAuth providers must be configured in the Supabase dashboard
