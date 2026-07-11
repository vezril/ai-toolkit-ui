# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.13.0] - 2026-07-11

### Added

- **Toolkit versioning** (the repo as source of truth — ADR-0011): in git-tracked
  component directories, every UI save (workflows, skills incl. quick-fixes, agents)
  becomes a scoped commit — only the files the app wrote plus a per-directory
  `versions.json` carrying auto-patched semver stamps. The app never switches branches
  and never stages your unrelated dirty files. History panels on all three editors
  (`git log --follow` + version stamps) with **forward-only restore**: old content is
  committed forward as a new version, and a dirty file is auto-committed first so
  nothing is ever lost. A **Ship** card in Settings pushes accumulated commits to the
  `toolkit-ui-ship` side branch (no local branch movement; clears protected-main
  rulesets) and opens a gated PR via `gh`, degrading to push-only without GitHub.
  Non-git directories keep plain writes with all versioning UI hidden.
- **Hand-written workflow editing**: view mode gains Canvas / Meta / Source tabs — a
  surgical meta form (edits exactly the `meta` literal; the body is byte-untouched)
  and a raw-source editor with a syntax gate, both versioned. Generated workflows
  remain canvas-only.
- **Version-aware sync badges**: workflow list badges show "v1.3.0 local · v1.2.0
  deployed" instead of bare "differs", via `deployedVersion` recorded at sync time.

## [0.12.0] - 2026-07-11

### Added

- **Agents tool**: the toolkit's third component type gets a surface — list every agent
  definition in a configurable agents directory with health badges, declared-tool counts,
  and deploy badges against `~/.claude/agents` that distinguish symlinks (always current)
  from copies (in sync / differs) and absences. Editor with the same coached description
  field as skills (descriptions drive delegation routing), tools and model frontmatter,
  and full-fidelity round-trips: unknown frontmatter keys survive, and a no-op save never
  rewrites the file (hand-written YAML style — folded scalars, quoting — is preserved
  until a field actually changes). Validation blocks structural errors; unknown tool
  names warn without blocking.
- **Agents directory setting** (fourth configured root).
- Lands ahead of toolkit versioning so the git-backed machinery covers workflows, skills,
  and agents uniformly.

## [0.11.0] - 2026-07-11

### Added

- **Workflow builder**: a Workflows tool for Claude Code workflow scripts. The list view
  shows every script in a configurable workflows directory with meta, phase counts,
  composition badges, and a sync-status badge against `~/.claude/workflows` (one-click
  healing). Hand-written scripts visualize read-only on an SVG canvas — their declared
  `meta.phases` as a node chain plus dashed edges to workflows they invoke. Builder-created
  workflows round-trip exactly (the declarative step model is embedded in the file):
  add/remove/reorder sequential steps, each with a title, instructions, and an optionally
  wired skill (referenced by name + description in the generated agent prompt, with each
  step receiving the previous step's result). Saves generate a runnable Workflow-tool
  script — parse-validated, injection-safe codegen — written to both managed locations.
  The UI never executes workflows; runs stay in Claude Code.
- **Workflows directory setting** in Settings (validated path, third sandboxed root).

### Follow-up (documented, not built)

- Parallel fan-out steps (`parallel()` branches / per-item pipelines) — the step model
  reserves room; v1 is deliberately sequential-only.

## [0.10.0] - 2026-07-11

### Added

- **Coach-guided refinement**: the four content-gap coach findings (too few test cases,
  no failure-mode check, no deterministic check, seeded placeholder input) now expand
  inline in the builder's coach panel to targeted forms whose answers become draft
  structure instantly — new test cases inherit copies of the existing checks, guard and
  deterministic checks apply across every test case, and the placeholder is replaced in
  place. Findings clear live as you answer; nothing touches disk until the normal Save.
  Calibration findings (thresholds, weights, phrasing) stay advisory — the builder's own
  controls are their fix.
- **Skill-derived hints**: on skill evals, the placeholder form offers clickable chips
  extracted mechanically from the skill's own description (quoted trigger phrases and the
  "Use when…" clause). Text reuse only — the app still makes no direct model calls.
- The coach card on generated configs' Overview links "Refine in builder →".

## [0.9.0] - 2026-07-11

### Added

- **Skill quick-fixes**: mechanical health findings now carry one-click fixes in a new
  Health panel on the skill editor — quoting the scalar that breaks frontmatter parsing
  (offered only when the repair verifiably re-parses), syncing the frontmatter name to
  the directory, and repairing unresolved `[[links]]` (replacement suggested only within
  edit distance 2; hopeless links offer unwrapping to plain text). Every fix previews as
  a line-scoped inline diff and writes nothing until Apply; previews are content-hash
  guarded (a stale preview cannot apply), and every write is post-verified with automatic
  revert on failure. Judgment-class findings (description length, empty body) deliberately
  offer no fix, and the app still makes no direct model calls.

## [0.8.0] - 2026-07-11

### Added

- **Run guardrails** (closes baseline architecture risk R-3): starting a run for a config
  that's already running is rejected; total in-flight runs are capped (Settings, default 2);
  each run gets a timeout (default 15 minutes, 0 disables) that terminates the child's
  entire process group — SIGTERM, then SIGKILL after 5 seconds — and marks the run failed
  with a note in its log. Both knobs live in a new Settings → Runs section and apply to
  subsequently started runs without a restart.

## [0.7.0] - 2026-07-11

### Added

- **Guided setup** (`/guide`): five terse, skippable stages — Purpose, Success, Failure,
  Evidence, Calibrate — whose answers mechanically become a pre-populated eval draft
  (success lines → rubric checks with auto-slugged metrics; never-appear lines →
  must-NOT-contain checks; failure modes → "avoids…" judge checks; easy/hard/ambiguous
  inputs → test cases; tapped load-bearing criteria → weight ×2 / threshold 0.7). The
  wizard owns no persistence — it hands the draft to the eval builder.
- **Eval coach**: seven static, advisory-only structural heuristics (single test case,
  no failure-mode check, no deterministic check, uncalibrated thresholds, undifferentiated
  weights, non-observable rubric phrasing, leftover placeholder input) surfaced as a live
  panel in the builder and structure badges on every dashboard config card — hand-written
  configs included.
- **"Must NOT contain" check kind** (promptfoo `not-contains`/`not-icontains`) in the
  eval builder, with full round-trip support.

## [0.6.0] - 2026-07-11

### Added

- **Blind A/B evals**: the eval builder supports an optional comparison prompt (B) —
  every test case runs against both prompts — and a "Blind A/B winner" check
  (promptfoo `select-best`) where the judge picks the better variant unlabeled.
  The results page becomes variant-aware: per-variant pass counts in the stat row,
  test cards grouped with variants side by side, and a win tally when A/B checks ran.
  The builder warns when an A/B check is paired with a CLI-script judge (API-provider
  judges parse the comparison reliably).
- **Create A/B eval from a skill**: generates the with-skill arm plus a deliberately
  plain baseline arm (same template, no skill block), seeded with rubric and A/B-winner
  checks — the blind with-vs-without comparison from the skill evaluation framework.
  Skill sync continues to regenerate only the with-skill prompt.

### Fixed

- Generated eval configs referenced runner scripts as `./<script>.js`, but promptfoo
  resolves `exec:` paths against the config file's directory — runs of builder-generated
  evals (which live under `evals/`) failed to find the scripts. Generated configs now
  reference `../<script>.js`. Existing generated configs can be fixed by re-saving in
  the builder.

## [0.5.0] - 2026-07-11

### Added

- **Skill → EDD eval loop**: a "Create EDD eval" action on every skill (editor and list
  card) generates a starter promptfoo eval in the target project that embeds the skill
  as loaded context above `{{request}}`, seeded with a rubric check, and opens it in the
  eval builder for refinement. When the skill changes, the action becomes
  "Sync skill → eval" (with a staleness hint) and regenerates only the prompt file —
  test cases and checks are never touched. Hand-written evals occupying a
  `skill-<name>` slug are refused, never overwritten.

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

[0.13.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/vezril/ai-toolkit-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/vezril/ai-toolkit-ui/releases/tag/v0.1.0
