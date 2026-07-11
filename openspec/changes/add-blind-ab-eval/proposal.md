## Why

A per-dimension pass rate proves a skill-loaded response is *good*; it doesn't prove the skill *caused* it. Calvin's evaluation framework names the fix — blind A/B: run the same request with and without the skill and have a blind judge pick the winner; if the baseline ties, the skill isn't pulling weight. The v0.5.0 skill→eval loop generates the with-skill arm only; this change adds the baseline arm and the comparison machinery.

## What Changes

- **Eval builder gains an optional comparison prompt (B)**: a second prompt file serialized as promptfoo's second `prompts:` entry. Every test case then runs each enabled model against both prompts.
- **New check kind: "Blind A/B winner"** (promptfoo `select-best`): the judge sees all prompt variants' outputs for a test — unlabeled — and picks the one that best satisfies the criterion. Only valid when a comparison prompt exists (validated client- and server-side).
- **Results viewer becomes variant-aware**: per-test cards group by prompt variant (labels from the prompt file names), the stat row splits pass counts per variant, and select-best outcomes render as a win tally (A vs B) with the judge's reasons.
- **"Create A/B eval" on skills**: alongside the existing create action, generates both arms — `skill-<name>.prompt.md` (with skill) and `skill-<name>.baseline.prompt.md` (identical template, no skill block) — seeded with a select-best check ("Which response better follows the skill's guidance…") plus the existing rubric check. Skill sync continues to touch only the with-skill prompt file.
- **Judge guidance**: `select-best` responses parse reliably from API-provider judges; the builder warns when a select-best check is paired with an exec-script (CLI) judge.

## Capabilities

### New Capabilities
- `eval-ab-comparison`: two-prompt comparison evals — the comparison prompt in the builder, the select-best check kind, and variant-aware results with win tallies.

### Modified Capabilities
- `skill-builder`: ADDED requirement — the A/B creation mode for skill evals (two generated arms, seeded select-best check, sync semantics unchanged).

## Impact

- **Server:** `lib/evals.ts` (draft: optional `promptB`; serialize/parse second prompt entry + `select-best` assertions; validation coupling select-best↔promptB); `lib/results.ts` (prompt label per row, win tallies); `lib/skillEval.ts` (A/B generation, baseline template).
- **UI:** builder (`app/new/page.tsx`): comparison-prompt section + new check kind + judge warning; run page (`app/runs/[id]/page.tsx`): variant grouping, per-variant stats, win tally; skill editor/card: A/B create action.
- **Round-trip:** two-prompt generated configs remain fully builder-editable (prompts[0] = main, prompts[1] = comparison); ADR-0004's bounded-fidelity contract extends to the new fields.
- **Cost note:** an A/B run costs ~2× a standard run (every test × both prompts) plus the select-best judging — surfaced in the builder UI next to the comparison prompt.
- **Docs:** PRD §11 delta row (extends FR-10/FR-14/FR-22..24), CHANGELOG under **v0.6.0**.
- **Dependencies:** none added.
