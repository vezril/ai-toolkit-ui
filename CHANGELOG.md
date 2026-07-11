# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-07-11

### Added

- **Skill Builder**: a Skills tool in the sidebar for browsing, creating, and editing
  Agent Skills (`SKILL.md`) in a configurable skills directory. The editor coaches the
  description (the field that decides triggering) with live length feedback against the
  200–1500-char recommended band and the Agent Skills standard's 1024-char cap, exposes
  the documented optional frontmatter (`disable-model-invocation`, `user-invocable`,
  `allowed-tools`, `argument-hint`), and preserves any frontmatter fields it doesn't
  model. A structural validator runs on save (errors block; warnings inform) and powers
  per-skill health badges on the list view.
- **Skills directory setting**: Settings gains a validated absolute-path field
  (e.g. `~/Code/claude-toolkit/skills`); skill file access is sandboxed to that
  directory, independent of the eval sandbox (ADR-0010).

## [0.3.0] - 2026-07-10

### Added

- **Sidebar navigation**: persistent left sidebar hosting all tools (Dashboard, New
  evaluation, Runs) with active-tool highlighting and a Settings entry pinned at the
  bottom; collapses to an icon rail below 900px. Replaces the top nav.
- **Settings page** (`/settings`): manage provider API keys (Anthropic, OpenAI, Google) —
  add, replace, remove. Keys are stored in `~/.ai-toolkit-ui/settings.json` (owner-only
  `0600` permissions, outside any git repo) and are always masked after save.
- **Direct API providers**: the eval builder's model grid gains an API-providers group
  (`anthropic:*`, `openai:*`, `google:*`) alongside the CLI runners, with the same
  toggle/model/max-tokens controls and judge support. API entries are gated on a
  configured key (client-side and server-side), and configured keys are injected into
  spawned `promptfoo eval` runs as conventional environment variables — never written
  to YAML, logs, or run artifacts.

### Changed

- PRD assumption A3 superseded: the model catalog is now CLI runners + key-gated API
  providers (see `docs/prd.md` §11 and ADR-0009).

## [0.2.0] - 2026-07-10

### Added

- **Eval builder** (`/new`): create a new prompt evaluation from a form — name, prompt
  (with automatic `{{request}}` placement), example inputs, and plain-English checks
  (text-contains and AI-judge criteria with pass bar and importance) — no YAML required.
  The promptfoo config and prompt file are generated under `evals/` in the target project.
- **Model toggles**: per-runner on/off switches (Devin, Claude Code, GitHub Copilot,
  Google Antigravity, Kiro) with model selection and optional max-tokens, plus a judge
  picker for AI-judge checks. Every enabled model answers all test cases for side-by-side
  comparison.
- **Edit in builder**: evals created by the builder round-trip back into the form (from
  the dashboard or config page), so their YAML never needs hand-editing.
- "Save & run test" launches the eval immediately after saving.

### Changed

- Provider badges no longer repeat the model name when the label already includes it.

## [0.1.0] - 2026-07-10

### Added

- Dashboard that auto-discovers promptfoo configs in the target project, with provider,
  grader, prompt-file, and test-count summaries.
- Config pages with tabs for a test/assertion overview, the config YAML, the prompt under
  test, and referenced test-suite files — all editable in the browser.
- One-click eval runs (`promptfoo eval --no-cache`) with live log streaming and persistent
  run history.
- Results viewer with pass-rate stats, per-test cards, per-assertion scores and judge
  reasons, and expandable model output.
- `PROJECT_ROOT` environment variable to point the UI at any promptfoo project.

[0.4.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/vezril/ai-toolkit-ui/releases/tag/v0.1.0
