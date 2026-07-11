## Why

The eval coach diagnoses structural gaps but every one of its findings bottoms out in content only the user can supply — so unlike skill health findings (v0.9.0's mechanical fixers), there's nothing a machine can *derive*. What it can do is ask the right question in the right place: the guided-setup wizard already proved that targeted questions convert mechanically into the exact missing structure (test cases, failure guards, deterministic checks). This change points that trick at existing evals, inline in the coach panel.

## What Changes

- **Inline refinement on coach findings** (explored and decided: inline in the panel, not a separate wizard flow): each refinable finding in the builder's coach panel expands to a small in-place form whose answers mutate the draft directly — Save remains the only write:
  - *Only one test case* → "Hard case / Ambiguous case" inputs → new test cases carrying copies of the existing checks.
  - *No failure-mode check* → "must never appear, one per line" → not-contains checks added to every test case.
  - *No deterministic check* → "text a good answer always contains" → contains checks added to every test case.
  - *Seeded placeholder input* → "what would someone actually ask?" → replaces that test's request.
  - Non-refinable findings (uncalibrated thresholds, equal weights, vague phrasing) keep their advisory-only rendering — the builder's own controls are their fix.
- **Skill-derived hints** (decided: yes): when the eval is a skill eval (`skill-<name>` slug), the placeholder-refinement form shows clickable hint chips extracted mechanically from the skill's description — quoted trigger phrases and the "Use when…" clause — as starting points for a realistic request. Text reuse only; the app still makes no direct model calls.
- **Config-page findings link to the builder**: the read-only coach card on generated configs' Overview gains a "Refine in builder →" link.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `eval-coach`: ADDED requirements — inline refinement actions on refinable findings, and skill-description hints for skill-eval placeholder refinement.

## Impact

- **Client-first:** the refinement forms live in the builder's `CoachPanel` and mutate draft state — no new write API; the existing Save path is the only persistence.
- **Server (small):** `GET /api/evals?config=` gains `skillHints` for `skill-*` slugs (extraction helper in `lib/skillEval.ts`, reading the skill description through the existing skills sandbox).
- **UI:** `app/new/page.tsx` CoachPanel forms; `app/config/page.tsx` refine link.
- **Docs:** PRD §11 delta row; CHANGELOG under **v0.10.0**.
- **Dependencies:** none; zero model calls.
