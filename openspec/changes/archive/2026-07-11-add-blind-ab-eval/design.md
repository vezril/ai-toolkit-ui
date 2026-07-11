## Context

v0.5.0 generates single-arm skill evals; the eval builder's draft model, serializer, parser, and results normalizer all assume one prompt. promptfoo itself is already multi-prompt: `prompts:` is a list, every test×provider runs per prompt, results rows carry `promptIdx`/prompt metadata, and the `select-best` assertion has the judge compare all variants' outputs for a test and pick the best — exactly the blind-comparator shape from `skill-and-agent-evaluation.md` (Dimension 3, blind A/B).

## Goals / Non-Goals

**Goals:**
- Generic two-prompt comparison in the builder (not skill-specific), with `select-best` as a first-class check kind.
- Variant-aware results: per-variant pass rates and a win tally that answers "does the skill pull weight?" at a glance.
- One-click A/B generation from a skill, with the v0.5.0 sync contract intact (sync touches the with-skill arm only).

**Non-Goals:**
- N>2 prompt variants (promptfoo allows it; the builder UI stays A/B — the config remains hand-extensible).
- Cross-run comparison (old skill version vs new across separate runs) — `/runs` history remains the tool.
- Statistical significance / repeated-sampling machinery; one run = one signal, interpretation stays human.
- Position-bias mitigation beyond what promptfoo's select-best implements internally.

## Decisions

1. **Draft model: optional `promptB: string`** — not a variants array. A/B is the product concept (per the eval doc); two named fields keep the form, serializer, and round-trip simple. Serialization: `prompts: [file://<slug>.prompt.md, file://<slug>.b.prompt.md]` (skill A/B supplies `.baseline.` names via explicit paths in the draft-to-files mapping). Parse: prompts[0]→prompt, prompts[1]→promptB, >2 entries refused for builder editing (config page still edits them raw — bounded fidelity, ADR-0004).
2. **`select-best` as a check kind, validated against promptB** — `{ kind: 'ab-winner', criterion }` ⇄ `{ type: 'select-best', value }`. Coupling rule in `validateDraft`: ab-winner ⇒ promptB present. Per-test placement mirrors promptfoo semantics (the assertion lives on the test case and compares that test's variant outputs).
3. **Judge reliability guidance, not enforcement** — select-best asks the judge to output a structured choice; the CLI wrapper scripts were built for `llm-rubric` JSON and may parse unreliably. The builder warns on exec-judge + ab-winner but doesn't block: Calvin may fix the wrappers later, and promptfoo's parsing may tolerate more than we assume. Warning copy recommends an API judge (v0.3.0 machinery).
4. **Results: label from prompt, tally computed defensively** — `lib/results.ts` adds `promptLabel` per row (prompt label ?? file basename ?? `Prompt ${idx+1}`); win tally derived from select-best component results (the passing variant's row carries pass=true for that assertion). If promptfoo's result shape for select-best differs across versions, the tally degrades to absent while per-variant pass rates still render (same graceful-degradation stance as FR-22).
5. **Run page layout: group by test case, variants side by side** — one card per test case containing a sub-card per variant (badge = variant label, per-assertion rows as today), win ribbon on the winning variant when a tally exists. Keeps the single-prompt layout untouched when there's only one variant.
6. **Skill A/B baseline template** — same preamble minus the skill block: `Answer the following request.\n\nHere's the request:\n{{request}}`. Deliberately plain: the baseline should be "the model without the skill," not a competing prompt-engineering effort.

## Risks / Trade-offs

- [select-best output parsing with exec-script judges] → warned in UI; recommended path is an API judge; worst case the assertion errors on that test and the per-variant rubric passes still carry the comparison.
- [2× run cost surprises] → cost note pinned to the comparison-prompt section and the A/B create button title; runs remain strictly user-initiated (NFR-7).
- [Prompt-file naming divergence (`.b.` builder default vs `.baseline.` skill arm)] → parser keys on config `prompts:` entries, not naming conventions; names are cosmetic labels in results.
- [Round-trip of hand-added 3rd+ prompts] → explicit refusal with a clear message when opening in the builder (consistent with FR-14's contract), raw editing still available.

## Migration Plan

Single PR, **v0.6.0** (minor). Existing single-prompt evals unaffected (promptB absent). Rollback = revert; two-prompt configs remain valid promptfoo files runnable via CLI.

## Open Questions

- Should the win tally also aggregate across models when several are enabled (per-model tallies vs one combined)? Leaning per-model with a combined headline, decided at implementation by what the results shape makes cheap.
