## Context

v0.4.0 has both halves: the Skill Builder (skills root, `lib/skills.ts`) and the EDD eval pipeline (eval root, `lib/evals.ts` → `draftToFiles`, run/results machinery). Calvin's evaluation framework (`skill-and-agent-evaluation.md`) defines what a skill eval should measure; the cheapest slice this app can run today is **output quality with the skill in context**: embed the skill in the prompt, feed realistic requests, judge the responses against the skill's own guidance.

## Goals / Non-Goals

**Goals:**
- One-click skill → runnable starter eval, landing in the existing eval builder for refinement.
- A repeatable refine loop: edit skill → sync (prompt only) → re-run → compare — user's test investment is never clobbered.
- Zero new eval-side machinery: the output is an ordinary marker-stamped builder eval.

**Non-Goals:**
- **Triggering-accuracy evals** (does Claude *invoke* the skill from its description?) — requires driving Claude Code with the skill installed and observing skill invocation, which promptfoo exec providers don't expose. The eval doc's Dimension 2 stays in the skill-creator harness.
- **Blind A/B (with-skill vs without-skill)** — promptfoo supports multi-prompt configs, but the eval builder's draft model is single-prompt; extending it is its own change. Recorded as the natural v0.6 candidate.
- Auto-deriving good test inputs or criteria from the skill via an LLM (needs authoring-side model calls; separate proposal).
- Skill-eval result history/regression tracking beyond what `/runs` already shows.

## Decisions

1. **Generation composes existing modules** — new `lib/skillEval.ts` reads the skill via `lib/skills.ts` (its sandbox) and writes via `lib/evals.ts`'s `draftToFiles` path (its sandbox). Neither resolver crosses roots; the module owns only the mapping. Alternative (UI-side composition calling two APIs) rejected: the create-or-sync decision and staleness check belong server-side where both mtimes are visible.
2. **Prompt template shape** — generated prompt file:
   `You have the following skill loaded. Apply its guidance when answering.` + fenced skill block (description + body) + `Here's the request:\n{{request}}`. Plain, model-agnostic, and honest about what's being tested (guidance-following, not autonomous triggering).
3. **Seeded draft** — name `Skill: <name>` (slug `skill-<name>` fits the existing slugifier), first available CLI runner enabled + devin judge (same defaults as the eval builder), one test case: placeholder request `(replace with a realistic request this skill should handle)` and one rubric check `The response follows the <name> skill's guidance` with threshold 0.7/weight 1. Users refine in the builder — the seed's job is to be obviously editable, not clever.
4. **Sync = prompt file only, by construction** — sync path rewrites `evals/skill-<name>.prompt.md` and never opens the config. The spec's byte-identical-config scenario is enforced by code structure, not by care.
5. **Staleness by mtime comparison** — `SKILL.md` mtime > prompt-file mtime ⇒ stale. Cheap, no metadata file. Renames/moves outside the app can fool mtimes; acceptable for a local tool (same trust stance as everything else).
6. **Collision policy** — if `evals/skill-<name>` exists but is NOT marker-stamped (hand-written), the action fails with a clear error rather than adopting or overwriting; if it exists and is generated, the action is a sync. Never a silent overwrite.

## Risks / Trade-offs

- [Skill body exceeds sensible prompt size for CLI runners] → skills are md-sized (KBs); if one is pathological the run cost is visible in the eval builder before running. No hard cap in v1.
- [User renames a skill → orphaned `skill-<old>` eval] → out of scope (skill rename isn't a builder operation either); the orphan is an ordinary eval, deletable by hand.
- [Judge grading "follows the skill" with the skill only in the response prompt, not the judge's context] → the rubric criterion embeds the skill name and the graded output; for sharper judging users can edit the criterion. Passing the full skill to the judge doubles token cost — deliberate default: cheap first, sharpen by hand.

## Migration Plan

Single PR, **v0.5.0** (minor). No migration; feature is purely additive. Rollback = revert; generated evals remain as ordinary eval-builder artifacts.

## Open Questions

- Should the eval builder show a back-link ("from skill: tdd") on generated skill evals? Cosmetic; leaning yes if free (config `description` can carry it).
