## 1. Draft model + serialization (server)

- [x] 1.1 Extend `lib/evals.ts`: `EvalDraft.promptB?: string`; `CheckDraft` gains `{ kind: 'ab-winner', criterion }` ⇄ `select-best`; serialize two `prompts:` entries + write both prompt files; parse restores prompt/promptB and refuses >2 prompts with a clear builder error; `validateDraft` couples ab-winner ⇒ promptB
- [x] 1.2 Verify by API: create a two-prompt eval with an ab-winner check → YAML has two prompts entries + `select-best` assertion; round-trip restores both prompts and the check; ab-winner without promptB rejected 400; hand-adding a 3rd prompt then opening in the builder errors cleanly

## 2. Results + run page

- [x] 2.1 Extend `lib/results.ts`: `promptLabel` per row; per-variant stats; win tally from select-best components (defensively — absent tally degrades gracefully)
- [x] 2.2 Rework `app/runs/[id]/page.tsx`: group per test case with variant sub-cards side by side, per-variant pass counts in the stat row, win ribbon/tally when present; single-variant runs render exactly as before
- [x] 2.3 Verify with a mock echo-provider A/B run (two prompts, deterministic differing outputs, contains checks): variant labels correct, per-variant stats correct, single-prompt run unchanged; clean up mock artifacts

## 3. Builder UI

- [x] 3.1 `app/new/page.tsx`: "Comparison prompt (B)" section (add/clear, cost note); "Blind A/B winner" check kind (criterion field only); inline warning when ab-winner + exec-script judge; client-side coupling validation
- [x] 3.2 Verify in browser: add prompt B + ab-winner check, save, YAML correct, round-trip; removing prompt B with an ab-winner present blocks with message; exec-judge warning appears/disappears with judge choice

## 4. Skill A/B generation

- [x] 4.1 Extend `lib/skillEval.ts`: `createSkillEval(name, {ab: true})` → with-skill + `.baseline.` prompt files, config listing both, seeded rubric + ab-winner checks; sync continues to rewrite only the with-skill file (verify baseline + config byte-identical)
- [x] 4.2 Skill editor: "Create A/B eval" action beside the standard one (cost note in title); card keeps standard-only
- [x] 4.3 Verify: A/B create for `tdd` → three files, builder opens with both prompts + seeded checks; touch skill → sync → baseline and config byte-identical, with-skill prompt refreshed; clean up scratch files

## 5. Docs, versioning, release

- [x] 5.1 PRD §11 delta row; CHANGELOG under 0.6.0; README (A/B sentence in the Skill Builder and eval builder bullets)
- [ ] 5.2 Full verify pass over spec scenarios, feature-branch PR, human gate, merge, tag v0.6.0, archive (sync `eval-ab-comparison` capability + skill-builder delta into living specs)
