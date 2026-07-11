## Context

Explored (opsx:explore continuation, 2026-07-11) and decided: inline forms in the coach panel (no separate wizard flow); skill-derived hints for the placeholder fix. The coach panel already re-renders per draft change (v0.7.0); the wizard's answer→structure mappings are proven; the eval builder owns all persistence through Save. Coach findings differ fundamentally from skill health findings: nothing is derivable, so the machine supplies *questions and mapping*, the user supplies words.

## Goals / Non-Goals

**Goals:**
- Each content-gap finding answerable in place, answers becoming draft structure instantly, Save unchanged as the only write.
- Skill-eval placeholder refinement seeded with the skill's own trigger phrases (mechanical extraction).

**Non-Goals:**
- AI-suggested content (fifth deferral of the direct-model-call boundary — the hint chips are text reuse, not generation).
- Refinement forms for calibration findings (thresholds/weights/phrasing) — the builder's own controls are that fix; a form would duplicate them.
- Refinement on the config page or dashboard (link to the builder instead — one surface owns draft mutation).
- Persisting anything outside the existing Save path.

## Decisions

1. **Purely client-side mutation** — refinement forms call the builder's `setDraft`; no new write endpoint exists, so the no-accidental-write property is structural. The coach panel already recomputes findings from the draft on every render, so applied refinements clear their findings live, for free.
2. **New test cases copy the first test's checks** — matches the wizard's every-test-carries-all-checks model and the skill-eval seed shape (checks live on test 1). Copies are deep (`{...c}` per check) so later per-test edits don't alias.
3. **Whole-draft check additions** (failure guards, deterministic checks) apply to every test case — same rationale; per-test targeting stays available in the normal check editors afterward.
4. **Hint extraction = two regexes over the description** — double-quoted phrases (`"([^"]{3,60})"`) and the sentence starting `Use when` (trimmed, first ~120 chars), deduplicated, max ~6 chips. Runs server-side in `lib/skillEval.ts` (it owns the skill↔eval mapping and both sandboxes' etiquette) and rides the existing `GET /api/evals?config=` response as `skillHints: string[]` when the slug matches `skill-<name>` — no new endpoint. Chips *insert* text (replacing current input value) rather than auto-submitting; the user always confirms.
5. **Refinable-finding detection by message identity** — the coach returns stable message strings; the panel maps them to form kinds with a lookup, same matching approach as the health panel's `coveredBy`. If a message is reworded, the form silently doesn't appear (advisory rendering remains) — degradation, not breakage.

## Risks / Trade-offs

- [Message-string matching is brittle to rewording] → single module owns both (coach messages and the panel's map import from `lib/coach.ts` constants if drift ever bites; start simple).
- [Whole-draft check additions may over-apply to a test where the guard is irrelevant] → visible immediately in the builder; deleting a check is one click. Under-applying (test 1 only) was judged more confusing.
- [Hint regex misses unquoted trigger phrases] → chips are a bonus, not a contract; the input remains free text.

## Migration Plan

Single PR, **v0.10.0** (minor). Purely additive client behavior + one additive API field. Rollback = revert.

## Open Questions

- None — scope settled across the two explore rounds.
