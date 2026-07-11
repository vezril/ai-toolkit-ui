## 1. Generation + sync (server)

- [x] 1.1 Create `lib/skillEval.ts`: `skillEvalPaths(name)` (slug `skill-<name>` → config/prompt paths in the eval root); `skillEvalStatus(name)` (none / current / stale via mtime comparison, refusing non-marker-stamped collisions); `createSkillEval(name)` (seeded draft through `draftToFiles`); `syncSkillEval(name)` (rewrite prompt file only)
- [x] 1.2 Create `app/api/skills/eval/route.ts`: GET `?name=` → status; POST `{name}` → create-or-sync, returning `{configPath, action: 'created'|'synced'}`; 400 on unconfigured roots or hand-written collision
- [x] 1.3 Verify by API: create for `tdd` → both files exist, prompt embeds skill body + `{{request}}`, config is marker-stamped with the seeded rubric check; add a test case via the eval API, edit the skill, sync → config byte-identical, prompt updated; status reports stale before sync and current after; hand-written collision rejected

## 2. UI wiring

- [x] 2.1 Skill editor (`app/skills/edit/page.tsx`): eval action button — "Create EDD eval" (none) / "Sync skill → eval" with stale hint (stale) / "Open EDD eval" secondary link (current); create/sync navigates to `/new?config=…`
- [x] 2.2 Skills list (`app/skills/page.tsx`): per-card shortcut for the same action with the same three states
- [x] 2.3 Verify in browser: create from the `tdd` card → lands in the eval builder with the seeded test; refine (add a test), edit the skill, confirm stale hint appears, sync, confirm tests intact in the builder; clean up the scratch eval files afterward

## 3. Docs, versioning, release

- [x] 3.1 PRD §11 delta row for `add-skill-edd-eval`; note reuse of FR-10..16 (no new eval-side requirements)
- [x] 3.2 Bump to 0.5.0; CHANGELOG entry; README (Skill Builder bullet gains the EDD-loop sentence)
- [x] 3.3 Full verify pass over the spec scenarios, feature-branch PR, human gate, merge, tag v0.5.0, archive the change (sync delta into the living skill-builder spec)
