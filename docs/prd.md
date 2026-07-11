# AI Toolkit UI — Baseline Product Requirements Document

**Status:** Baseline (retroactive) — reflects shipped state as of **v0.2.0**
**Date:** 2026-07-10
**Type:** Brownfield baseline. This document does not propose new work; it captures the "what" already built and shipped, plus explicitly-known intent, so future feature work has a canonical artifact to diff against. New features should be proposed as deltas against this baseline (new/changed FR-N, NFR-N) rather than by editing history here.
**Source of truth used to produce this baseline:** `README.md`, `CHANGELOG.md` (v0.1.0, v0.2.0 entries), `package.json`, `lib/paths.ts`, `lib/configs.ts`, `lib/evals.ts`, `lib/runs.ts`, `lib/results.ts`, `app/**` (pages, components, API routes) in `/Users/cference/Code/ai-toolkit-ui`.

---

## 1. Vision

Calvin runs evaluation-driven prompt development (EDD) against prompts and AI-coding-CLI providers using `promptfoo`. The raw workflow — hand-editing YAML configs, prompt markdown, and test-suite files, then shelling out to `promptfoo eval` and reading a results JSON — works but is slow and error-prone for the parts that don't need to be YAML: writing a test case, toggling a model on, tuning a rubric threshold.

AI Toolkit UI is a local-first companion web app that puts a form in front of the promptfoo project on disk: it discovers existing evals, lets you edit them (via structured overview + raw file tabs), lets you build new ones without hand-writing YAML, launches runs, and renders results — while keeping YAML as the underlying, git-tracked representation so the CLI workflow never breaks. It does not replace promptfoo; it is a UI shell around a file system that promptfoo already understands.

## 2. Target users + jobs-to-be-done

**The one user (v0.2.0): Calvin**, a solo developer running everything on his own machine against a promptfoo project directory he owns.

| JTBD | Statement |
|---|---|
| JTBD-1 | When I want to know what evals already exist in a project, I want a single dashboard view of configs/providers/tests, so I don't have to `ls` and open YAML files to find out. |
| JTBD-2 | When I want to create a new evaluation, I want to describe the prompt and test cases in a form, so I don't have to hand-write promptfoo YAML syntax (assertions, threshold/weight, exec provider wiring) from memory. |
| JTBD-3 | When I want to tweak an existing eval (test case, threshold, prompt wording), I want to edit it either as a form (if builder-created) or as raw files, so small changes don't require reconstructing YAML by hand. |
| JTBD-4 | When I want to run an eval, I want one click that starts `promptfoo eval` and shows me live progress, so I know it's working without babysitting a terminal — but I never want it to run without my explicit action, because runs cost real money. |
| JTBD-5 | When a run finishes, I want per-test, per-assertion pass/fail with judge reasoning and full model output, so I can decide what to fix without digging through raw JSON. |
| JTBD-6 | When I revisit a project days later, I want run history to still be there, so I can compare past runs without re-running them. |

## 3. Glossary

| Term | Meaning in this product |
|---|---|
| **Target project** | The promptfoo project directory on disk the UI points at, set via `PROJECT_ROOT`. Contains `promptfooconfig.yaml`-style configs, prompt `.md` files, provider scripts, test-suite YAMLs, and (once evals run) `eval-runs/`. All UI-created/edited artifacts live here, not in the UI app's own repo. |
| **Config** | A promptfoo YAML file identified by having both a `prompts` and a `tests` key. The unit shown on the dashboard and opened by the config page. |
| **Eval** | Informal synonym for a config + its associated prompt file(s) and test(s) — one evaluation "unit" a user creates, edits, and runs. |
| **Suite file** | A YAML file referenced from a config's `tests` list via `file://…`, containing a bare array of test cases, included/expanded into the config's test list. |
| **Prompt file** | A `.md` file referenced from a config's `prompts` list (`file://` or `@file` syntax), containing the prompt-under-test text, expected to include a `{{request}}` placeholder. |
| **Provider / runner** | A promptfoo "exec" provider that wraps an AI coding CLI (Devin, Claude Code, GitHub Copilot, Google Antigravity, Kiro) via a Node script (`devin.js`, `claude.js`, `gh_copilot.js`, `agy.js`, `kiro.js`) in the target project root. The builder's fixed catalog of 5 runners. |
| **Judge / grader** | The runner designated (via `defaultTest.options.provider`) to grade `llm-rubric` assertions across the whole config. |
| **Check / assertion** | A single pass/fail condition on a model's output for a test case. The builder supports two kinds: **text-contains** (`contains`/`icontains`) and **AI-judge rubric** (`llm-rubric`, with a criterion, optional metric label, threshold 0–1, weight). Promptfoo itself supports other assertion types not representable in the builder (see NFR-5). |
| **Run** | One invocation of `promptfoo eval --no-cache` against a specific config, spawned as a child process, tracked by a generated ID, with a live log, status (`running`/`completed`/`failed`), and (on completion) a results JSON file. |
| **Generated (builder-created) eval** | A config whose YAML file starts with the literal marker `# ai-toolkit-ui: eval-builder v1`. Only generated configs can round-trip into the builder form ("Edit in builder"); other configs are editable only via the raw YAML/file tabs. |
| **Draft** | The in-memory/form representation of an eval (name, prompt, models, judge, tests/checks) that the builder serializes to config YAML + prompt markdown, and parses back from generated YAML. |
| **Slug** | The filename-safe derivation of an eval's name (`evals/<slug>.config.yaml`, `evals/<slug>.prompt.md`), fixed at creation and reused (not re-derived from a renamed `name`) on subsequent edits. |

## 4. Key user journeys

- **UJ-1 — Discover:** Calvin points `PROJECT_ROOT` at a promptfoo project, opens the dashboard, and sees every eval config with provider/grader/prompt/test-count summaries without opening a file.
- **UJ-2 — Build a new eval:** Calvin opens `/new`, names the eval, writes a prompt, toggles on 1+ models with a chosen model string, adds 1+ test cases each with 1+ checks, picks a judge (if any rubric checks exist), and clicks "Save" or "Save & run test."
- **UJ-3 — Edit an existing eval:** Calvin opens a config from the dashboard; if it's builder-generated he lands in the builder form via "Edit in builder," otherwise he edits the config YAML / prompt / suite-file tabs directly as text.
- **UJ-4 — Run and watch:** Calvin clicks "Run eval" from the dashboard, config page, or builder; he's taken to a run page that live-streams the process log and, on completion, shows aggregate + per-test results.
- **UJ-5 — Review history:** Calvin opens `/runs` (or the dashboard's "Recent runs" panel) to find a past run and reopen its full results and log, even after restarting the dev server.

## 5. Functional requirements

IDs are stable and traceable to code in `lib/` and `app/`. Each has a testable consequence.

### 5.1 Discovery (dashboard, config scanning)

- **FR-1.** The system scans the target project (`REPO_ROOT`), up to 2 directory levels deep, for `.yaml`/`.yml` files, skipping `node_modules`, `.git`, `webui`, `eval-runs`, `docs`, and dot-directories, and classifies a file as a **config** only if its parsed YAML has both a `prompts` key and a `tests` key.
  *Consequence:* A YAML file with only `tests` (a suite file) or only `prompts` never appears as a dashboard card; a file 3+ levels deep is never discovered.
- **FR-2.** For each discovered config, the system extracts: description, repo-relative path, resolved prompt file path(s), provider list (id/label/model), grader (from `defaultTest.options.provider`), test count with per-test description/source/vars/assertions (type, metric, value, threshold, weight), suite files, `outputPath`, and whether it was builder-generated (starts with `GENERATED_MARKER`).
  *Consequence:* Dashboard/config-page badges for providers, grader, prompt files, and test counts are always derived live from the YAML on disk, never cached separately.
- **FR-3.** The dashboard (`/`) lists every discovered config as a card (description, path, provider/grader/prompt-file/test-count badges) with an Edit link and a Run button, plus a "+ New evaluation" button linking to `/new`.
  *Consequence:* A newly created or hand-added config appears on the dashboard on next page load with no registration step.
- **FR-4.** The dashboard shows the 8 most recent runs (started time, config path, status badge, link to the run page); `/runs` shows the full run history table with duration.
  *Consequence:* Runs older than the 8 most recent are visible only via `/runs`, not the dashboard.
- **FR-5.** Each config's Edit link routes to the builder (`/new?config=<path>`) if the config is builder-generated, otherwise to the raw config page (`/config?file=<path>`).
  *Consequence:* A hand-written (non-generated) config never opens the builder form, even if its structure happens to be builder-compatible.

### 5.2 Editing (config detail page, raw file editing)

- **FR-6.** The config page's Overview tab renders providers, grader, included suite files, and one card per test (name/description, source file, vars, and assertion badges showing type, metric, threshold, weight).
  *Consequence:* Overview is read-only summarization; changing a threshold requires the YAML tab (or, for generated configs, the builder).
- **FR-7.** The config page exposes tabs for the Config YAML, each prompt file, and each suite file; each tab is a raw-text `FileEditor` with independent dirty-state tracking, an explicit Save button (disabled until dirty), and a transient "Saved ✓" confirmation.
  *Consequence:* Switching tabs or navigating away without clicking Save discards unsaved edits in that tab; no autosave exists.
- **FR-8.** File read (`GET /api/file`) and write (`PUT /api/file`) are restricted via `resolveRepoPath`: the resolved absolute path must stay under `REPO_ROOT`, must not include a `node_modules`/`.git`/`webui`/`eval-runs` path segment, and must have an extension in `{.md,.yaml,.yml,.js,.json}`.
  *Consequence:* Requests for `../../etc/passwd`, any path under a blocked segment, or a disallowed extension (e.g. `.env`, `.sh`) return HTTP 400 and never touch the filesystem.
- **FR-9.** Both the dashboard card and the config-page header show an "Edit in builder" link when `config.generated === true`.
  *Consequence:* The link is present/absent purely based on the `GENERATED_MARKER` YAML header, not on any separate registry.

### 5.3 Builder (eval creation and editing)

- **FR-10.** `/new` presents a form: eval name (locked after creation), prompt text (with `{{request}}` guidance and an "insert example prompt" helper), a fixed 5-runner grid (Devin/Claude Code/GitHub Copilot/Google Antigravity/Kiro) each with an enable toggle, a free-text model field (with a datalist of known models per runner), an optional max-tokens field, and a judge picker populated from the same runner catalog.
  *Consequence:* Only these 5 runners can ever be offered as models/judge; adding a 6th provider requires a code change to `RUNNER_CATALOG`, not a UI action.
- **FR-11.** The builder lets a user add/remove test cases; each test has an optional name, a required example input ("request"), and one or more checks, each either **text-contains** (text + ignore-case toggle) or **AI-judge rubric** (criterion, optional metric label, threshold 0–1, weight 0.5–10).
  *Consequence:* A test with zero checks, or a check with an empty required field, is rejected at save (see FR-12) — it cannot be silently saved incomplete.
- **FR-12.** Both client and server (`validateDraft`) require: non-empty name, non-empty prompt, ≥1 enabled model, ≥1 test case, each test's request non-empty with ≥1 valid check, and — if any rubric check exists anywhere in the draft — a judge selected.
  *Consequence:* POST/PUT `/api/evals` returns HTTP 400 with a human-readable problem list if any of these are violated, even if a client-side bug lets an invalid draft through.
- **FR-13.** Saving a new draft writes `evals/<slug>.config.yaml` and `evals/<slug>.prompt.md` under the target project, with the config YAML prefixed by `GENERATED_MARKER` and a hand-edit warning comment; creation fails with an explicit "already exists" error if a config at that slug already exists; edits (PUT) require the config to already exist and reuse its original slug/path regardless of a since-changed name.
  *Consequence:* Two evals can never silently collide on the same file; renaming an eval's display name during an edit never orphans or duplicates files.
- **FR-14.** "Edit in builder" (`GET /api/evals?config=`) is only permitted for generated configs (`isGeneratedConfig` check) and reconstructs: prompt text from the referenced prompt file; the full 5-runner model grid with enabled/model/maxTokens populated from matched providers and all others shown off; the judge from `defaultTest.options.provider`; and the test/check list from `contains`/`icontains`/`llm-rubric` assertions only.
  *Consequence:* Opening a non-generated config via `?config=` returns an error instead of a form. Any assertion type other than `contains`/`icontains`/`llm-rubric` present in a generated config's YAML (e.g. added by hand) is dropped from the parsed draft and will not reappear if that draft is subsequently saved (see NFR-5).
- **FR-15.** "Save & run test" performs the save (POST/PUT) then immediately POSTs `/api/runs` with the resulting config path and navigates to that run's page; "Save" alone navigates to the config page without starting a run.
  *Consequence:* A run only ever starts as the direct, synchronous result of this one user-initiated button click — never as a side effect of Save alone.

### 5.4 Execution (running evals)

- **FR-16.** Any Run button (dashboard card, config page, builder's "Save & run test") POSTs `/api/runs` with a config path, which spawns `npx promptfoo eval --no-cache --config <abs-path> --output <abs-path-in-eval-runs>` as a child process with `cwd = REPO_ROOT` and `FORCE_COLOR=0`, and returns HTTP 201 with a run ID.
  *Consequence:* Every run is traceable to exactly one config path and one output file; the spawned command is always exactly this shape (no ability to pass extra CLI flags from the UI).
- **FR-17.** Each run is assigned a unique ID (`<ISO-timestamp>-<6-char-random>`), tracked in an in-process map (log, status, exit code, timestamps) and mirrored to `eval-runs/<id>.meta.json` (metadata only, not the log) on every state change.
  *Consequence:* Two runs started in the same millisecond never collide (random suffix); `eval-runs/<id>.meta.json` always reflects the latest known status even if the server process is later restarted.
- **FR-18.** The run page (`/runs/[id]`) polls `GET /api/runs/[id]` every 1.5s while `status === 'running'`, appending stdout/stderr to a live, auto-scrolled log pane; status becomes `completed` if the output file exists when the child process closes, otherwise `failed`.
  *Consequence:* A promptfoo exit code of non-zero (which happens whenever any assertion fails) is *not* treated as a failed run as long as an output file was produced — only a missing output file (crash, invalid config, missing CLI) is a `failed` run.
- **FR-19.** The accumulated run log is capped at 2,000,000 characters, trimming the oldest content first.
  *Consequence:* Extremely long-running or verbose evals never grow the log buffer unboundedly in server memory.
- **FR-20.** `listRuns()` merges persisted `*.meta.json` files with any live in-memory runs (live takes precedence), sorted newest-first by start time; any run still marked `running` in a `.meta.json` file with no matching live entry (i.e., the server restarted mid-run) is presented as `failed`.
  *Consequence:* After a server restart, a run that was in progress at shutdown shows as `failed` on both `/runs` and the individual run page, with the log replaced by `"(log unavailable — run predates this server session)"` — it is never shown as still `running`.
- **FR-21.** All run artifacts (`*.meta.json`, results JSON referenced by `outputFile`) live under `eval-runs/` inside the target project, not inside the UI app's own directory or database.
  *Consequence:* Deleting/reinstalling the UI app does not delete run history; deleting `eval-runs/` in the target project does delete it.

### 5.5 Results

- **FR-22.** On a completed run, the run page fetches `GET /api/runs/[id]/results`, which loads and defensively normalizes the promptfoo `--output` JSON (handling at least two known result-array shapes) into `{ stats: {total, passed, failed}, results: [...] }`; if the file is missing or unparseable, the endpoint returns HTTP 404.
  *Consequence:* A malformed or promptfoo-version-shifted results file degrades to "no parseable results" in the UI (FR-25) rather than crashing the page.
- **FR-23.** The results view shows an aggregate stat row (total/passed/failed/pass-rate %) and one card per test with a PASS/FAIL badge, numeric score (if present), provider label, vars, and an error message if the test errored.
  *Consequence:* Pass-rate is always computed as `passed / total` client-independent, from the same normalized data used for the per-test badges (no drift between the two).
- **FR-24.** Each test's assertions render as expandable rows showing pass/fail, metric-or-type label, numeric score, the rubric criterion text (if applicable), and the judge's reason text (if provided by promptfoo).
  *Consequence:* A failing rubric check always surfaces its judge reason inline, without needing to open the raw results JSON.
- **FR-25.** If a run's status is `completed` but no results object was returned, the UI shows "Run finished but no parseable results were found" instead of an empty or broken results section.
- **FR-26.** If a run's status is `failed`, the UI shows an explicit message including the exit code and a pointer to the log, instead of attempting to render results.
- **FR-27.** Model output for a test, when present, is available in an expandable "Model output (N chars)" section rather than shown inline by default.
  *Consequence:* Long model outputs (e.g. full generated PRDs/code) don't push assertion detail off-screen by default.

## 6. Non-functional requirements

- **NFR-1 (Local-only, single-user, no auth).** The app has no authentication, session, or authorization code anywhere in `app/api/**`; every route trusts the local caller. *Verification:* code review of `app/api/**` shows no auth middleware; manual check confirms any local browser hitting `localhost:3210` has full read/write/run access with no login step.
- **NFR-2 (No telemetry).** `package.json` dependencies (`next`, `react`, `react-dom`, `yaml`) contain no analytics/telemetry SDK; the app makes no outbound network calls of its own (only the spawned `promptfoo`/provider CLI processes may, per target-project configuration). *Verification:* dependency audit of `package.json`; network trace during a UI session with no run in progress shows zero outbound requests besides same-origin `/api/*` calls.
- **NFR-3 (Path-sandbox guarantee).** `resolveRepoPath` rejects any resolved path outside `REPO_ROOT`, any path containing a blocked segment (`node_modules`, `.git`, `webui`, `eval-runs`), or any extension outside `{.md,.yaml,.yml,.js,.json}`, for both file read and file write. *Verification:* a request for `path=../../../etc/passwd`, `path=eval-runs/x.json`, or `path=whatever.env` each returns HTTP 400 with no filesystem access, for every route that calls `resolveRepoPath` (`/api/file`, `/api/runs` config lookup, `/api/evals`).
- **NFR-4 (Run-history durability across restarts).** Run status, timestamps, exit code, and config/output paths for every started run persist to `eval-runs/<id>.meta.json` on every state transition and are recoverable after a server restart; only the live log text of a run in progress at restart time is lost (replaced with a fixed placeholder string), and such a run is deterministically reclassified `failed`. *Verification:* start a run, kill the dev server mid-run, restart it, confirm `/runs` and `/runs/[id]` both show `failed` with the placeholder log text and correct `startedAt`.
- **NFR-5 (YAML round-trip fidelity — bounded).** For a builder-generated config edited exclusively through the builder, "Edit in builder" → change something → Save reproduces all fields the builder itself can express (name, prompt text, enabled models + model + maxTokens, judge, tests, `contains`/`icontains`/`llm-rubric` checks) without loss. This guarantee explicitly does **not** extend to hand-edits that add assertion types, providers, or YAML structure the builder doesn't model — those are silently dropped on the next builder save. *Verification:* round-trip a generated config with only builder-expressible content and diff before/after semantic YAML (should match); separately, hand-add a non-`llm-rubric`/`contains` assertion to a generated config, round-trip it through the builder, and confirm it is absent afterward (documenting, not "fixing," the known limitation).
- **NFR-6 (Explicit-save editing).** `FileEditor` never calls `PUT /api/file` except on a direct user click of "Save changes," and the Save button is disabled whenever the buffer is not dirty. *Verification:* edit text in any file tab, navigate away without clicking Save, reload — original file content on disk is unchanged.
- **NFR-7 (No auto-run of evals).** No code path in `lib/runs.ts`, any API route, or any page effect (`useEffect`) calls `startRun`/`POST /api/runs` other than as the direct synchronous consequence of a user clicking a Run button or "Save & run test." *Verification:* code review confirms `startRun` has exactly the call sites in `RunButton.onClick` and `BuilderInner.save(true)`; no polling, file-watch, or scheduled-job code exists anywhere in the repo.
- **NFR-8 (Bounded discovery scan).** Config discovery (`findYamlFiles`) is capped at `MAX_SCAN_DEPTH = 2` from `REPO_ROOT` and skips known-large/irrelevant directories (`node_modules`, `.git`, `webui`, `eval-runs`, `docs`, dotfiles). *Verification:* a config placed 3+ directories deep in the target project does not appear on the dashboard; scan time on a target project with a large `node_modules` does not scale with `node_modules` contents.
- **NFR-9 (Versioning discipline).** Releases follow Semantic Versioning with changes documented in `CHANGELOG.md` under Keep-a-Changelog headings (Added/Changed/etc.), and `package.json`'s `version` matches the latest `CHANGELOG.md` entry at time of release. *Verification (already true at baseline):* `package.json` version `0.2.0` matches `CHANGELOG.md`'s top entry `## [0.2.0] - 2026-07-10`.
- **NFR-10 (No automated test coverage — known gap, not a target).** As of v0.2.0 there is no test suite (no `test` script in `package.json`, no test files found in the repo). This is recorded as a fact of the baseline, not a requirement being satisfied — see Open Questions §9.

## 7. Non-goals

Explicitly out of scope for the product as currently conceived (not merely "not yet built"):

- **Multi-user support, authentication, or authorization.** Single local user, single machine, no login.
- **Cloud hosting or multi-tenant deployment.** Designed to run as `next dev`/`next start` on localhost against a local filesystem; not designed for a shared/hosted deployment model.
- **Replacing the promptfoo CLI.** The UI is a companion/wrapper — it shells out to `npx promptfoo eval` and reads its output; it does not reimplement evaluation, grading, or provider-execution logic.
- **Prompt/config version history beyond git.** No in-app diff, undo, or version browser; the target project's own git history is the only version record.
- **Auto-running evals** — on file save, on a schedule, on file-watch, or on any trigger other than a direct user click — because runs invoke paid AI CLIs and must never happen accidentally (see NFR-7).
- **Representing arbitrary promptfoo assertion types in the builder.** The builder is intentionally limited to `contains`/`icontains`/`llm-rubric`; other assertion types require hand-editing YAML and are not guaranteed to survive builder round-trips (NFR-5).
- **Editing or generating the provider runner scripts themselves** (`devin.js`, `claude.js`, `gh_copilot.js`, `agy.js`, `kiro.js`). The UI treats them as pre-existing black boxes it references by filename; it does not author or modify their internal logic.
- **Enforcing `maxTokens`** at the provider-CLI level — the field is stored and round-tripped in config YAML, but whether it's honored is entirely up to the referenced runner script (see Open Questions §9).
- **Supporting eval frameworks other than promptfoo,** or config formats other than promptfoo's YAML schema.
- **Real-time or multi-tab collaborative editing.** `FileEditor` and the builder assume a single active editor per file; concurrent edits from two tabs/users are last-write-wins with no conflict detection.

## 8. Success metrics (with counter-metrics)

| # | Success metric | Target | Counter-metric (guards against gaming the success metric) |
|---|---|---|---|
| SM-1 | Time from opening `/new` to first `/runs/[id]` view, for a 1-model/1-test eval | < 5 minutes | **Accidental paid runs per week** must be 0 — a run is "accidental" if it started without a direct click on a Run/"Save & run" control (see NFR-7). Speeding up eval creation must never come at the cost of a run firing unintentionally. |
| SM-2 | Share of edits to builder-created evals made without ever opening the raw "Config YAML" tab | ≥ 80% of builder-created evals never hand-edited | **YAML round-trip data-loss incidents** must be 0 — if builder-only editing corrupts or drops fields on save (beyond the documented NFR-5 limitation), that's a defect, not a UX win. |
| SM-3 | Dashboard config-discovery completeness: (# configs shown) / (# actual promptfoo-eval YAML files in target project) | 100% | **False-positive rate**: non-eval YAML (suite files, unrelated YAML) misclassified as a config on the dashboard, target 0%. Completeness must not be bought by over-broad matching. |
| SM-4 | Run history availability after a server restart: (# past runs still listed with correct status) / (# runs that existed before restart) | 100% | **Silent status corruption**: 0% of restarted runs should ever be shown as `running` when they are not actually running (must always resolve to `failed`, per FR-20/NFR-4) — availability must not come at the cost of a misleading "still running" state. |
| SM-5 | Results-page comprehension: time from run completion to Calvin identifying which specific assertion(s) failed and why | < 30 seconds (no need to open raw JSON) | **Raw-JSON fallback rate**: how often Calvin still has to go read the output JSON file directly because the UI's normalization dropped/misrepresented data — target 0 occurrences per month; a rising rate here would mean SM-5 is being "met" only because the UI shows *something* fast, not the *right* thing. |

## 9. Assumptions & open questions

**Assumptions (recorded, not yet re-verified with the user):**
- A1: "Target project" always has a runnable `promptfoo` (local dependency or global) and the provider CLIs its configs reference, as stated in the README setup section — the UI does not check or install these.
- A2: `PROJECT_ROOT` is trusted input (an env var Calvin sets himself); the sandboxing in `resolveRepoPath` protects against accidental path bugs within the app, not against a malicious `PROJECT_ROOT` value or a malicious config file.
- A3: ~~The 5-runner catalog (Devin, Claude Code, GitHub Copilot, Google Antigravity, Kiro) is treated as effectively fixed/hardcoded for the v0.2.0 era; adding a 6th provider is a code change, not a config-driven extension point.~~ **Superseded in v0.3.0** by the `add-sidebar-and-settings` change: the model catalog is now CLI runners **plus** key-gated direct API providers (Anthropic/OpenAI/Google). Both catalogs remain code-defined; extending either is still a code change. See §11.
- A4: "Local-first" and "no auth" are permanent product stances tied to the single-user assumption, not temporary gaps — see Non-goals §7.

**Open questions (need a decision before being treated as settled):**
- OQ-1 (flagged by task brief). **`maxTokens` enforcement gap:** `maxTokens` is captured in the builder UI, validated, and written into provider config YAML (FR-10, FR-13), and read back on round-trip (FR-14) — but whether it's actually honored depends entirely on each runner script (`devin.js`, `claude.js`, etc.), and per the known caveat, current runner scripts only honor `model`, not `maxTokens`. **Should the UI (a) hide/disable the field until runners support it, (b) show an inline warning that it's not yet enforced, or (c) leave as-is and treat runner-side enforcement as separate future work?** Until decided, users can silently believe they've capped token usage when they haven't.
- OQ-2. **Non-generated configs cannot use the builder at all** (FR-5, FR-14) — is there any intent to let Calvin "adopt" a hand-written config into the builder (one-way import, stamping it generated), or is that permanently out of scope per non-goal on assertion-type coverage?
- OQ-3. **Test-suite coverage for the UI itself** (NFR-10) — no automated tests exist at v0.2.0. Is this an accepted risk for a single-user local tool, or a near-term backlog item? Left unresolved in this baseline since it wasn't in scope to invent.
- OQ-4. **Scan-skip / access-block list asymmetry** — `configs.ts`'s directory scan additionally skips `docs` (not scanned for configs) while `paths.ts`'s file-access block list does not include `docs` (so a `.yaml` under `docs/` could still be opened/edited via `/api/file` even though it'll never appear on the dashboard). Is this intentional (docs YAML is editable but not eval-discoverable) or an oversight?
- OQ-5. **Result-schema normalization scope** — `loadResults` defensively handles two known promptfoo output shapes ("written defensively: promptfoo's output schema shifts between versions" per its own comment). Is there a target promptfoo version range this baseline is committed to supporting, so future promptfoo upgrades that shift the schema again have a clear "this is now unsupported" trigger?

## 10. Definition-of-Ready check

Applied per requirement above:
- **Necessary** — every FR/NFR traces to an existing, observed code path (file + line-level behavior read directly from the repo); nothing here is speculative "should probably have."
- **Unambiguous** — each FR states the trigger, the mechanism, and the exact resulting UI/system state (including edge cases like missing output files, server restarts, and non-generated configs).
- **Singular** — FRs are split by discrete behavior (e.g., discovery scanning vs. classification vs. rendering are separate FR-1/FR-2/FR-3) rather than bundled.
- **Feasible** — trivially true; this is a description of already-running code, not a proposal.
- **Verifiable** — every NFR includes an explicit verification method; every FR's "consequence" line is phrased as an observable, testable outcome.
- **Traceable** — every ID (FR-N, NFR-N, UJ-N, SM-N, OQ-N) is stable and grounded in a cited file/behavior, ready for future feature specs to reference (e.g., "extends FR-11" or "supersedes NFR-5's round-trip limitation").

Two items fell short of full DoR and are surfaced rather than silently resolved: **OQ-1** (maxTokens enforcement — behavior is ambiguous by design, not by omission of this document) and **OQ-4** (scan/access-list asymmetry — behavior is verifiable but intent is unknown). Both are recorded above rather than guessed at.

## 11. Applied deltas

Changes shipped after this baseline, in OpenSpec form under `openspec/changes/`; requirement-level effects are summarized here so IDs stay resolvable.

| Version | Change | Requirement effects |
|---|---|---|
| v0.3.0 | `add-sidebar-and-settings` | **Supersedes A3** (catalog = CLI runners + key-gated API providers). **Extends FR-10** (builder model grid gains an API-providers group and API judges). **Extends FR-16** (run spawn env includes configured API keys as `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GOOGLE_API_KEY`). **Adds** sidebar navigation (replaces the top nav), a `/settings` page, and app-level key storage (`~/.ai-toolkit-ui/settings.json`, 0600, masked reads — see ADR-0009). New capability specs: `sidebar-navigation`, `app-settings`, `direct-api-providers`. |
| v0.4.0 | `add-skill-builder` | **Adds** the Skills tool: list/create/edit Agent Skills (SKILL.md) in a configurable skills directory, with research-derived authoring guidance and a structural validator (errors block, warnings inform). **Extends** `app-settings` (skills-directory setting) and `sidebar-navigation` (Skills entry). Introduces a second sandboxed root independent of `REPO_ROOT`, with full-fidelity frontmatter round-trips — see ADR-0010. New capability spec: `skill-builder`. |
| v0.5.0 | `add-skill-edd-eval` | **Extends** `skill-builder`: one-click generation of an EDD eval (`evals/skill-<name>`) embedding the skill as loaded context, with sync-without-clobbering-tests and mtime-based staleness. The generated eval reuses existing eval behavior unchanged (FR-10..FR-16, ADR-0004 marker contract) — no new eval-side requirements. |
| v0.6.0 | `add-blind-ab-eval` | **Adds** `eval-ab-comparison`: optional comparison prompt (B) in the builder, the Blind A/B winner check (promptfoo `select-best`), and variant-aware results with win tallies (extends FR-10/FR-14/FR-22..24). **Extends** `skill-builder`: "Create A/B eval" (with-skill vs plain baseline; sync still touches only the with-skill arm). **Fixes** generated `exec:` provider paths — promptfoo resolves them against the config's directory, so configs under `evals/` now reference `../<script>.js` (previously `./`, which failed at run time). |
| v0.7.0 | `add-guided-eval-setup` | **Adds** `guided-eval-setup` (five-stage wizard at `/guide` producing a pre-populated builder draft; no persistence of its own) and `eval-coach` (seven static advisory heuristics — live panel in the builder, structure badges on every dashboard config card incl. hand-written configs). **Extends FR-11** (new `not-contains` check kind) and **FR-3** (dashboard structure badges). Zero model calls; coach findings never block. |
| v0.8.0 | `add-run-guardrails` | **Adds** `run-guardrails`, closing architecture risk R-3: per-config in-progress guard, global concurrency cap (default 2), and a process-group-killing spawn timeout (default 15 min, 0 = off). **Extends** `app-settings` (Runs section) and **FR-16/FR-18** (start-time guards, timeout-induced failure). Extends NFR-7's spirit from "no accidental starts" to "bounded in-flight spend". |
