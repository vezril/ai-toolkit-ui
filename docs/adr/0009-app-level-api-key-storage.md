# ADR-0009: App-level plaintext API-key file (0600) with masked reads, injected as env vars

**Status:** Accepted

## Context

The `add-sidebar-and-settings` change (v0.3.0) introduces direct API providers (Anthropic/OpenAI/Google) in the eval builder, which need API keys at `promptfoo eval` run time. Keys must never enter either git repository (the app's or the target project's), never appear in generated YAML or run artifacts, and remain simple to manage for a single local user (PRD NFR-1/A2/A4 trust model).

## Decision

Keys live in `~/.ai-toolkit-ui/settings.json`, created with mode `0600` inside a `0700` directory, owned by `lib/settings.ts` as the single choke point (mirroring `lib/paths.ts`'s role for path safety). Reads for the UI are masked at the API boundary (`GET /api/settings` returns provider + last-4 + set-date only); full keys flow client→server solely in PUT bodies at save time. At run start, `lib/runs.ts` merges `settingsEnv()` — the conventional env vars `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GOOGLE_API_KEY` — into the spawned child's environment; promptfoo resolves them natively. Keys are never passed as CLI arguments, written under `REPO_ROOT`, or echoed to logs.

## Consequences

- One file to secure, audit, and delete; surviving target-project switches; unreachable via `/api/file` (it's outside `REPO_ROOT`, so the path sandbox rejects it structurally).
- Plaintext-at-rest is the accepted trade for a local single-user tool: OS-keychain integration would add a native dependency (breaking the 4-package footprint, AC-1) and encryption-at-rest merely relocates the secret. Revisit if the no-hosting stance (Non-goals §7) ever flips.
- Env vars are visible to the whole spawned process tree, including CLI runner scripts — same trust domain, accepted.
- Masking is boundary-level, not storage-level: any code with fs access to the home directory can read keys. That is the same trust model as `~/.aws/credentials` and `~/.npmrc`, and is deliberate.
- The provider catalog (`API_PROVIDERS` in `lib/settings.ts`) hardcodes the three providers and their env-var names; adding a fourth is a code change, consistent with the CLI runner catalog's approach (superseded-A3 stance carried forward).
