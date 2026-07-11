## Why

The eval builder is a form for someone who already knows what to test; the hard part of EDD — deciding *what deserves testing* — happens before the form, unassisted. And once an eval exists, nothing tells you it's structurally weak (one test case, uncalibrated thresholds, no failure-mode checks). A terse guided-setup wizard turns the methodology (purpose → success → failure → evidence → calibration) into five quick prompts that leave behind a well-formed draft, and a static eval coach keeps grading structure for the eval's whole life — in the builder and on the dashboard.

## What Changes

- **Guided setup wizard** (`/guide`, "✦ Guided setup" button on the dashboard beside "+ New evaluation"): five terse, skippable stages — Purpose (prompt text), Success (each line → a rubric check with auto-slugged metric), Failure (never-appear lines → not-contains checks; failure modes → rubric checks), Evidence (easy/hard/ambiguous inputs → three test cases), Calibrate (tap load-bearing criteria → weight ×2 / threshold 0.7; rest ×1 / 0.5). Output is a pre-populated draft handed to the existing eval builder — the wizard owns no persistence.
- **Eval coach** (`lib/coach.ts`): static heuristics over an eval's structure, advisory-only (never blocks). Initial rules: single test case; no failure-mode/negative check; no deterministic check; all thresholds at default; all weights equal; non-observable rubric phrasing ("is good/clear/helpful"); leftover seeded placeholder input. Surfaced in two places:
  - a live coach panel in the eval builder;
  - structure badges on every dashboard config card (hand-written configs included — the trust-ai course configs get graded day one).
- **New check kind: "must NOT contain"** (promptfoo `not-contains`), needed by the wizard's Failure stage and generally missing — full builder support and round-trip, same pattern as prior check kinds.
- Skill→eval creation stays one-click (explored and decided): skill evals inherit criteria from the skill; the coach's nudges cover their refinement.

## Capabilities

### New Capabilities
- `guided-eval-setup`: the five-stage wizard, its answer→draft mapping rules, and the handoff into the builder.
- `eval-coach`: the heuristic catalog, advisory-only stance, builder panel, and dashboard structure badges.

### Modified Capabilities
_None with living specs. The `not-contains` check and dashboard badge extend PRD FR-11/FR-3 (recorded as a PRD §11 delta; the core eval builder predates OpenSpec)._

## Impact

- **Server:** new `lib/coach.ts` (pure heuristics over a neutral tests+checks shape, usable client- and server-side); `lib/evals.ts` gains the `not-contains` check kind; `/api/configs` summaries gain coach findings.
- **UI:** new `app/guide/page.tsx` (wizard, client-only state, sessionStorage handoff to `/new`); builder gains the coach panel + not-contains check editor; dashboard cards gain structure badges.
- **Audience note:** built for a solo expert user — terse copy, every stage skippable, all output editable in the builder afterward; teaching depth deliberately minimal.
- **Docs:** PRD §11 delta row; CHANGELOG under **v0.7.0**.
- **Dependencies:** none added; zero model calls (the coach is static heuristics, the wizard is pure UI).
