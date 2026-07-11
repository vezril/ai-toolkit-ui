# AI Toolkit UI

A Next.js web interface for **evaluation-driven prompt development (EDD)** with
[promptfoo](https://promptfoo.dev). Point it at a promptfoo project and it gives you the whole
EDD loop in the browser: edit the prompt and tests → run the eval → read per-dimension results →
iterate.

## Features

- **Eval builder** — create a new prompt evaluation from a form: write the prompt, add
  example inputs with plain-English checks (text-contains and AI-judge criteria), toggle
  models on/off with per-model settings, then save & run. The promptfoo YAML is generated
  under `evals/` in the target project; builder-created evals round-trip back into the
  form for editing.
- **CLI runners + direct API providers** — evaluate via the target project's AI-CLI
  wrapper scripts (Devin, Claude Code, GitHub Copilot, Google Antigravity, Kiro) and/or
  directly via provider APIs (Anthropic, OpenAI, Google). API entries unlock when you add
  a key in Settings and are injected into runs as environment variables only.
- **Settings** — sidebar-pinned system configuration: provider API keys stored in
  `~/.ai-toolkit-ui/settings.json` (owner-only permissions, outside any git repo), masked
  after save; plus the skills-directory path for the Skill Builder.
- **Skill Builder** — browse, create, and edit Agent Skills (`SKILL.md`) in a configured
  skills directory, with authoring guidance baked into the form (description length band,
  trigger-phrase coaching, optional frontmatter fields) and structural health checks
  (errors block saves, warnings inform; badges on the list view). Unknown frontmatter
  survives edits untouched.
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
