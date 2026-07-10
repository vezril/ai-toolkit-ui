# AI Toolkit UI

A Next.js web interface for **evaluation-driven prompt development (EDD)** with
[promptfoo](https://promptfoo.dev). Point it at a promptfoo project and it gives you the whole
EDD loop in the browser: edit the prompt and tests → run the eval → read per-dimension results →
iterate.

## Features

- **Dashboard** — auto-discovers every promptfoo config in the target project and shows
  providers, grader, prompt files, and test counts.
- **Config pages** — edit the config YAML, the prompt-under-test, and any referenced test-suite
  files in the browser; an Overview tab summarizes tests with per-assertion thresholds, weights,
  and metrics.
- **Run evals** — one click spawns `promptfoo eval --no-cache` with a live-streaming log.
- **Results viewer** — per-test pass/fail with per-dimension assertion scores, judge reasons,
  and expandable model output.
- **Run history** — kept in `eval-runs/` inside the target project (gitignore it there).

The UI edits the same files you would edit by hand, so everything stays version-controlled and
CLI runs keep working unchanged.

## Setup

```bash
npm install
cp .env.example .env.local   # then set PROJECT_ROOT
npm run dev                  # serves http://localhost:3210
```

`PROJECT_ROOT` must be the absolute path of the promptfoo project you want to work on (the
directory containing `promptfooconfig.yaml`). If unset, the app falls back to its parent
directory.

The target project needs `promptfoo` runnable via `npx` (a local dependency or global install),
plus whatever provider CLIs its configs reference (Claude Code, Devin, Copilot, …).

## Versioning

This project follows [Semantic Versioning](https://semver.org): breaking changes bump the major
version, new features the minor, fixes the patch. Releases are tagged `vX.Y.Z` and documented in
[CHANGELOG.md](CHANGELOG.md).
