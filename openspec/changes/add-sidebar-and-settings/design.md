## Context

Baseline (v0.2.0, see `docs/architecture.md`): single Next.js quantum, filesystem-as-database inside the target project, models reached only via 5 exec-script CLI wrappers hardcoded in `RUNNER_CATALOG` (`lib/evals.ts`), runs spawned by `lib/runs.ts` with `env: { ...process.env, FORCE_COLOR: '0' }`. Navigation is a top bar in `app/layout.tsx`. There is no settings surface and no secret storage anywhere. This change adds a sidebar shell, an app-settings capability with API-key storage, and key-gated direct API providers in the builder — superseding PRD assumption A3 and extending FR-10/FR-16.

## Goals / Non-Goals

**Goals:**
- One stable navigation surface (sidebar) that new tools can join without layout rework.
- API keys stored once, app-level (`~/.ai-toolkit-ui/settings.json`, 0600), masked on read, injected into runs as env vars.
- Builder + judge picker offer `anthropic:`/`openai:`/`google:` providers, gated on key presence, round-tripping like CLI runners.

**Non-Goals:**
- OS-keychain integration (file + 0600 is the accepted bar for a local single-user tool; revisit if that stance changes).
- Arbitrary/custom provider ids or per-eval keys — the API catalog is curated, keys are global.
- Encrypting settings.json at rest (no key-management story exists that doesn't just move the secret).
- Mobile-first sidebar UX beyond the icon-rail collapse.

## Decisions

1. **Sidebar as a layout-level server component wrapping a client `<NavLinks>`** — the shell (logo, structure) stays in `app/layout.tsx`; only the active-route highlight needs `usePathname`, isolated in a small client component. Alternative (full client layout) rejected: needless client bundle for static chrome.
2. **Settings module mirrors the existing lib pattern** — new `lib/settings.ts` owning read/write/mask/env-shape, one choke point like `lib/paths.ts` is for path safety. Storage: `~/.ai-toolkit-ui/settings.json`, created lazily with `{ mode: 0o600 }` and `fs.chmodSync` after rewrite. Alternatives: target-project `.env` rejected (git-leak risk, per-project duplication); OS keychain rejected (native dependency breaks the 4-package footprint, AC-1).
3. **Masking at the API boundary, not the store** — `GET /api/settings` returns `{provider, last4, setAt}`; full keys only flow client→server in PUT bodies. The page never holds full keys after save, so there's nothing to leak into React state/devtools.
4. **API providers join the existing draft model as a parallel catalog** — `API_PROVIDER_CATALOG` (`anthropic`/`openai`/`google` with model suggestion lists and env-var names) beside `RUNNER_CATALOG`; `ModelDraft` gains `kind: 'cli' | 'api'`. Serialization: API entries emit promptfoo-native ids (`anthropic:<model>`) with `config.max_tokens`; parsing recognizes the three id prefixes for round-trip. Alternative (unifying both catalogs into one abstraction) rejected: CLI runners have script-existence checks and judge semantics that don't map 1:1; two small explicit lists beat one leaky abstraction at this size.
5. **Key injection at spawn time only** — `startRun` merges `settingsEnv()` into the child env (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`). Keys never touch CLI args (visible in `ps`), generated YAML, logs, or meta.json. promptfoo natively resolves these env vars for its API providers — zero new run plumbing.
6. **Server-side key gating in `validateDraft`** — enabling an API provider without its key is a 400 at save, not just a disabled toggle, so the invariant holds even against a stale client.
7. **Judge via API provider** uses promptfoo's normal grader provider syntax (`defaultTest.options.provider: anthropic:<model>`), replacing the exec-script grader when chosen — strictly better grading separation than CLI self-judging.

## Risks / Trade-offs

- [Plaintext key file on disk] → 0600 perms, app-level dir outside all repos, masked reads; accepted per single-user trust model (PRD A2/A4). Revisit if hosting stance ever changes.
- [Env vars visible to all spawned descendants, incl. CLI runner scripts] → acceptable: same trust domain; keys are scoped to conventional names promptfoo expects anyway.
- [promptfoo provider-id/model drift (new models, renamed prefixes)] → model field stays free-text with datalist suggestions (same pattern as CLI cards); catalog update is a small code change.
- [Round-trip: hand-added API providers with unknown prefixes] → same bounded-fidelity contract as ADR-0004 — unrecognized providers drop on builder save; documented, not silently different.
- [Sidebar rework touches every page's frame] → CSS-grid shell change only; pages themselves untouched, verified visually per page.

## Migration Plan

Single PR, minor version bump (0.3.0). No data migration: absence of `settings.json` means "no keys" and the app behaves exactly as v0.2.0 (API cards visible but disabled). Rollback = revert; settings.json is forward-inert.

## Open Questions

- Model suggestion lists for the three API providers: ship with a curated snapshot (claude-sonnet-5/claude-haiku-4.5, gpt-5.2/gpt-5.2-mini, gemini-3.5-pro/gemini-3.5-flash) — refresh cadence is manual; acceptable?
- Should Settings later absorb other system config (default judge, run concurrency cap from risk R-3)? Layout will reserve room but this change ships keys only.
