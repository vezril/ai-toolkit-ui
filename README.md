[![release](https://github.com/vezril/ai-toolkit-ui/actions/workflows/release.yml/badge.svg)](https://github.com/vezril/ai-toolkit-ui/actions/workflows/release.yml)
# AI Toolkit UI

A Next.js web interface for **evaluation-driven prompt development (EDD)** with
[promptfoo](https://promptfoo.dev). Point it at a promptfoo project and it gives you the whole
EDD loop in the browser: edit the prompt and tests → run the eval → read per-dimension results →
iterate.

## Features

- **Eval builder** — create a new prompt evaluation from a form: write the prompt, add
  example inputs with plain-English checks (text-contains, must-NOT-contain, and AI-judge
  criteria), toggle models on/off with per-model settings, then save & run. The promptfoo
  YAML is generated under `evals/` in the target project; builder-created evals round-trip
  back into the form for editing.
- **Guided setup & eval coach** — a five-stage wizard (purpose → success → failure →
  evidence → calibration) turns answers into a well-formed draft, and a static coach
  grades every eval's structure (live in the builder, badges on the dashboard) with
  advisory one-liners — methodology encoded in defaults, never blocking. Content-gap
  findings refine inline: answer a targeted question in the coach panel and the missing
  structure appears in the draft (skill evals even hint the answer from the skill's own
  trigger phrases).
- **CLI runners + direct API providers** — evaluate via the target project's AI-CLI
  wrapper scripts (Devin, Claude Code, GitHub Copilot, Google Antigravity, Kiro) and/or
  directly via provider APIs (Anthropic, OpenAI, Google). API entries unlock when you add
  a key in Settings and are injected into runs as environment variables only.
- **Agents tool** — browse and edit agent definitions with the same coached descriptions
  and full-fidelity round-trips as skills, plus deploy badges that know a symlink from a
  drifting copy in `~/.claude/agents`.
- **Workflow builder** — visualize Claude Code workflow scripts (declared phases +
  composition edges on an SVG canvas, sync status against `~/.claude/workflows`) and build
  new sequential ones visually: wire steps to your skills and save a runnable, round-trippable
  Workflow-tool script to both managed locations. Execution stays in Claude Code.
- **Toolkit versioning** — in git-tracked component directories, every save is a scoped
  commit with a semver stamp (`versions.json`); history and loss-free forward-only
  restore on every editor; hand-written workflows gain surgical meta and raw-source
  editing; and a Ship button batches your UI edits into a gated PR without ever touching
  your local branches.
- **Settings** — sidebar-pinned system configuration: provider API keys stored in
  `~/.ai-toolkit-ui/settings.json` (owner-only permissions, outside any git repo), masked
  after save; plus the skills-directory path for the Skill Builder.
- **Skill Builder** — browse, create, and edit Agent Skills (`SKILL.md`) in a configured
  skills directory, with authoring guidance baked into the form (description length band,
  trigger-phrase coaching, optional frontmatter fields) and structural health checks
  (errors block saves, warnings inform; badges on the list view), and mechanical findings
  carry one-click verified quick-fixes behind inline diff previews. Unknown frontmatter
  survives edits untouched. One click creates an **EDD eval** for a skill — a promptfoo
  eval embedding the skill as loaded context — and keeps it synced as the skill evolves,
  without ever touching your test refinements. Or create a **blind A/B eval**: with-skill
  vs a plain baseline, judged unlabeled per test, with win tallies in the results —
  proof the skill actually pulls its weight.
- **Dashboard** — auto-discovers every promptfoo config in the target project and shows
  providers, grader, prompt files, and test counts.
- **Config pages** — edit the config YAML, the prompt-under-test, and any referenced test-suite
  files in the browser; an Overview tab summarizes tests with per-assertion thresholds, weights,
  and metrics.
- **Run evals** — one click spawns `promptfoo eval --no-cache` with a live-streaming log,
  guarded against runaway spend: one in-flight run per config, a global concurrency cap,
  and a hung-run timeout that reaps the whole process tree (all tunable in Settings).
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

## Run in Docker

A published image runs the app as a **self-contained service**: it clones `vezril/claude-toolkit`
into a data volume on first boot, keeps an empty promptfoo project for your evals, and persists
everything (settings, API keys, version history) in that volume.

> ⚠️ **No authentication.** This image is meant for a trusted network. Anyone who can reach the
> port has full control — including your stored API keys and, if you provide one, the git-push
> token. Do **not** expose it to the public internet; keep it on a LAN/VPN you trust, or front it
> with your own authenticating reverse proxy.

```bash
# quickest: compose (edit env as needed)
docker compose up -d          # → http://<host>:3210

# or plain docker
docker run -d -p 3210:3210 -v aitk-data:/data vezril/ai-toolkit-ui:latest
```

Configuration is env-driven (the image ships self-configuring defaults; override any):

| Env | Default | Purpose |
|---|---|---|
| `TOOLKIT_REPO` | `…/vezril/claude-toolkit.git` | repo cloned in for skills/agents/workflows |
| `SKILLS_DIR` / `AGENTS_DIR` / `WORKFLOWS_DIR` | `/data/claude-toolkit/*` | component roots |
| `PROJECT_ROOT` | `/data/evals` | where builder evals + run history live |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | local/sidecar Ollama for free evals |
| `GITHUB_TOKEN` | — | repo-scoped token; enables **Ship** (push + PR). Omit for read-only toolkit |
| `GIT_AUTHOR_NAME` / `_EMAIL` | AI Toolkit UI | identity for versioned commits |

**What works in the container vs. what needs the host:**

| Capability | In container |
|---|---|
| API providers (Anthropic/OpenAI/Google, with keys) | ✅ |
| Ollama local models (via `OLLAMA_BASE_URL`) | ✅ |
| Skills / agents / workflows authoring + git versioning + Ship | ✅ (clone + `GITHUB_TOKEN`) |
| CLI runner scripts (devin / claude / copilot / …) | ⚠️ host-installed & authed — not in the image |

Publishing the image needs a one-time `dockerhub-setup` (Docker Hub repo + `DOCKERHUB_USERNAME`/
`DOCKERHUB_TOKEN` GitHub secrets); until then CI builds and skips the push.

## Versioning

This project follows [Semantic Versioning](https://semver.org): breaking changes bump the major
version, new features the minor, fixes the patch. Releases are tagged `vX.Y.Z` and documented in
[CHANGELOG.md](CHANGELOG.md).
