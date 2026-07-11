## Context

Explored (opsx:explore, 2026-07-11) and decided: audience is Calvin alone (terse over teaching); guided setup is a separate entry ending in the existing builder, not a builder mode; the coach also grades existing evals (dashboard badges, including hand-written trust-ai configs); skill→eval stays one-click, with the coach as the refinement nudge. The builder's draft model (`EvalDraft`), check-kind pattern (`contains`/`rubric`/`ab-winner`), and the skill health-badge precedent (advisory findings, list badges) are the building blocks.

## Goals / Non-Goals

**Goals:**
- Five terse stages that mechanically become a draft — methodology encoded in defaults and placeholders, not prose.
- A coach that lives with the eval: live in the builder, at rest on the dashboard, never blocking.
- `not-contains` check kind (wizard needs it; the builder was missing it anyway).

**Non-Goals:**
- AI-assisted suggestions (would be the app's first direct model call — separate proposal with its own ADR if ever).
- Teaching depth / course-student mode; recipe template gallery.
- Routing skill→eval through the wizard (revisit only if the coach nudge proves too weak).
- Coach heuristics requiring model calls or run history.

## Decisions

1. **Wizard is client-state only; handoff via sessionStorage** — `/guide` builds an `EvalDraft` in memory; Finish writes `sessionStorage['guided-draft']` and navigates to `/new?guided=1`, which hydrates from it (and clears it) instead of the default empty draft. No server endpoint, no files, abandonment is free. Alternative (server-side draft persistence) rejected: adds state lifecycle for zero benefit at one user.
2. **Coach is a pure function over a neutral shape** — `lib/coach.ts` exports `coachFindings(tests: {request, checks}[], meta): Finding[]` operating on draft-shaped data. The builder calls it client-side on the live draft; `/api/configs` calls it server-side after adapting each config's parsed `TestSummary[]` (type/value/threshold/weight map cleanly). One heuristic catalog, two call sites — no duplication. Finding = `{ message, principle }`, one line each, no severity tiers (advisory is the only tier; the validator owns blocking).
3. **Findings ride the existing summary** — `ConfigSummary` gains `coach: Finding[]`; dashboard badge shows count; the config page Overview lists them. No new endpoint.
4. **`not-contains` completes the deterministic pair** — `{ kind: 'contains', negate?: true }`? No: a distinct `{ kind: 'not-contains', text, ignoreCase }` mirroring promptfoo's own type naming (`not-contains`/`not-icontains`), same serializer/parser/UI pattern as every prior kind. Distinct kind keeps the check-editor branching flat.
5. **Metric auto-slugging** — success-line → metric label via the same slugify used for eval names, truncated to ~4 words ("Includes at least one working code example" → `working-code-example` after stop-word trim; exact trim rules are implementation detail, uniqueness enforced by suffixing).
6. **Calibrate stage is tap-to-toggle** — criteria rendered as chips; tapped = load-bearing (×2 / 0.7), untapped = ×1 / 0.5. No sliders in the wizard; fine-tuning is the builder's job.
7. **Placeholder-detection heuristic** keys on the literal seed string from `lib/skillEval.ts` ("(replace with a realistic request…") — cheap and exact; if the seed text ever changes, the constant is shared.

## Risks / Trade-offs

- [Coach noise on legitimate small evals] → findings are one-line, advisory, and the badge is neutral-styled (not fail-red); if a rule proves noisy in practice, deleting it is a one-line change.
- [sessionStorage handoff lost on hard refresh mid-wizard] → acceptable at one user; stages are fast to redo. (Persisting wizard state is a non-goal.)
- [Non-observable-phrasing heuristic is crude (prefix match)] → deliberately so; false negatives fine, false positives near zero with a conservative pattern list.
- [`/api/configs` cost of coaching every config per dashboard load] → heuristics are O(tests) string checks over already-parsed data; negligible next to the existing YAML scan.

## Migration Plan

Single PR, **v0.7.0** (minor). Purely additive; existing evals gain badges but no behavior change. Rollback = revert.

## Open Questions

- Coach findings on the run page too ("this run's eval had 3 structural findings")? Leaning no for v0.7 — dashboard + builder cover the loop.
