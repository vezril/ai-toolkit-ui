## Why

The app's tools (dashboard, builder, runs — and everything added later) hang off a thin top nav, which is already cramped and gives new tools nowhere to live; and the only models the app can evaluate are the 5 locally-authenticated CLI wrappers, which shuts out direct API access to models Calvin has keys for. A persistent sidebar creates a stable home for a growing tool set, and a Settings area with securely stored API keys unlocks promptfoo's native API providers (Anthropic, OpenAI, Google, …) alongside the CLI runners.

## What Changes

- Replace the top-nav-only layout with a **persistent left sidebar** hosting navigation to all tools (Dashboard, New evaluation, Runs, Settings), with the active tool highlighted; content area shifts right accordingly.
- Add a **Settings page** (gear entry pinned at the bottom of the sidebar) for system configuration.
- Settings manages **provider API keys** (Anthropic, OpenAI, Google …): add/update/remove, masked display after save, stored **outside both git repos** in `~/.ai-toolkit-ui/settings.json` with `0600` permissions — never in the target project, never committed.
- The eval builder's model grid gains **direct API providers** (e.g. `anthropic:claude-sonnet-5`, `openai:gpt-5.2`) alongside the 5 CLI runners; API entries are only enabled when a matching key exists in Settings, and configured keys are injected as environment variables into spawned `promptfoo eval` child processes.
- **PRD deltas this implies:** assumption A3 (fixed 5-runner catalog) is superseded — the catalog becomes CLI runners + key-gated API providers; NFR-3's sandbox scope is unchanged (settings file lives outside `REPO_ROOT` and is not reachable via `/api/file`).

## Capabilities

### New Capabilities
- `sidebar-navigation`: persistent left-sidebar layout hosting all tool navigation and the Settings entry; replaces the top nav as the primary navigation surface.
- `app-settings`: system settings surface + storage — CRUD for provider API keys with masked display, persisted to an app-level config file (`~/.ai-toolkit-ui/settings.json`, mode 0600) outside any git repo.
- `direct-api-providers`: key-gated direct API model entries (Anthropic/OpenAI/Google) in the builder's model catalog and judge picker, with key injection into spawned promptfoo runs.

### Modified Capabilities
<!-- openspec/specs/ is empty at baseline (first change in this project) — no existing spec files to delta. Requirement-level changes to the shipped baseline are recorded against docs/prd.md: supersedes A3; extends FR-10 (model grid) and FR-16 (run spawning env). -->

## Impact

- **Layout/UI:** `app/layout.tsx` (top nav → sidebar shell), `app/globals.css` (sidebar + content-grid styles), every page inherits the new frame; new `app/settings/page.tsx`.
- **Server:** new `lib/settings.ts` (app-config read/write, key masking, chmod 600); new `app/api/settings/route.ts` (GET masked / PUT upsert / DELETE); `lib/evals.ts` catalog extended with API provider entries + key-availability gating; `lib/runs.ts` spawn env extended with configured keys.
- **Builder:** `app/new/page.tsx` model grid renders two groups (CLI runners, API providers) with key-gating states.
- **Security surface:** keys live in `~/.ai-toolkit-ui/settings.json` (0600), are masked in every API response after save, are never written inside `REPO_ROOT`, and never appear in logs or generated YAML (YAML references providers by id only; promptfoo resolves keys from process env).
- **Docs:** PRD delta (A3 superseded, FR-10/FR-16 extended), new ADR for app-level secret storage; CHANGELOG under a minor version bump (backward-compatible feature).
- **Dependencies:** none added — file-based settings keep the 4-package footprint (AC-1).
