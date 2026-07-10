# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/vezril/ai-toolkit-ui/releases/tag/v0.1.0
