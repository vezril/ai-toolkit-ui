## Why

A skill's real quality question — per `claude-toolkit/docs/skill-and-agent-evaluation.md` — is whether it *measurably shifts model output toward its guidance*, and today the app can author skills (v0.4.0) and run EDD evals (v0.2.0) but has no bridge between them: refining a skill means hand-building an eval that embeds it. One button closes the loop — skill → generated eval → run → read per-dimension results → edit the skill → sync → re-run.

## What Changes

- **"Create EDD eval" button** on the skill editor (and each skill's list card): generates a builder-generated eval in the target promptfoo project, pre-wired to the skill:
  - a prompt file that embeds the skill (description + body) as loaded context above `{{request}}`, so every test exercises the model *with the skill in effect*;
  - a starter eval config named `skill-<name>` with one seeded test case and starter AI-judge checks derived from the skill (criterion template: "The response follows the skill's guidance on …"), default model + judge;
  - then navigates straight into the existing eval builder for refinement (add real example inputs, tune checks) and "Save & run test".
- **Sync on re-click**: when the eval already exists, the button becomes "Sync skill → eval" — it regenerates only the prompt file from the skill's current content, leaving the user's test cases and checks untouched, then offers to open or run the eval. The eval page shows a staleness hint when the skill changed after the last sync.
- The generated eval is an ordinary marker-stamped builder eval (ADR-0004 contract): editable in the eval builder, runnable, archivable — no new eval machinery.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `skill-builder`: ADDED requirements — the Create-EDD-eval action, the generated artifact shape, and the sync-without-clobbering-tests behavior. (The eval side reuses existing FR-10..FR-16 behavior; its effects are recorded as a PRD delta, not a spec change.)

## Impact

- **Server:** new generation/sync logic in `lib/skills.ts` or a small `lib/skillEval.ts` (composes existing `draftToFiles` from `lib/evals.ts`); new endpoint `POST /api/skills/eval` (create-or-sync); staleness = prompt-file mtime vs SKILL.md mtime.
- **UI:** button + state (create vs sync) on `app/skills/edit/page.tsx` and list cards in `app/skills/page.tsx`.
- **Cross-root flow:** reads from the skills root, writes into the eval root (`evals/skill-<name>.*` under `REPO_ROOT`) — each side through its own existing sandbox; no new file-access surface.
- **Docs:** PRD §11 delta row (extends the skill-builder capability; reuses FR-10..16), CHANGELOG under **v0.5.0**.
- **Dependencies:** none added.
