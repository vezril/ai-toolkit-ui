# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/vezril/ai-toolkit-ui/releases/tag/v0.1.0
