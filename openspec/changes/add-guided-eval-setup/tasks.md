## 1. not-contains check kind

- [x] 1.1 `lib/evals.ts`: add `{ kind: 'not-contains', text, ignoreCase }` ⇄ `not-contains`/`not-icontains`; builder check editor + "+ Must NOT contain" button; round-trip parse
- [x] 1.2 Verify by API: serialize/round-trip both case modes; builder renders and edits the new kind

## 2. Eval coach (module + surfaces)

- [x] 2.1 Create `lib/coach.ts`: `Finding {message, principle}`; `coachFindings()` over draft-shaped tests+checks implementing the seven initial heuristics; shared placeholder-seed constant with `lib/skillEval.ts`
- [x] 2.2 Server surface: adapt `ConfigSummary` tests → coach input; `coach: Finding[]` on `/api/configs` summaries; dashboard cards get the structure badge (✓ / N findings); config-page Overview lists findings
- [x] 2.3 Builder surface: live coach panel (updates with the draft, no save needed), terse one-liners with principle
- [x] 2.4 Verify: craft drafts hitting each heuristic exactly once (unit-style via API + client); trust-ai configs show expected findings on the dashboard; findings never block save/run

## 3. Guided setup wizard

- [x] 3.1 Create `app/guide/page.tsx`: five skippable stages with back-nav state preservation; answer→draft mapping (success→rubric+auto-metric, never-appear→not-contains, failure-mode→inverted rubric, evidence→3 test cases, calibrate chips→weights/thresholds)
- [x] 3.2 Handoff: Finish → sessionStorage draft → `/new?guided=1` hydrates and clears it; dashboard gains the "✦ Guided setup" button
- [x] 3.3 Verify in browser: full wizard run produces the mapped draft in the builder (spec scenarios: success line → rubric with slugged metric; TODO → not-contains on each test); skip-all still lands in a usable builder; abandonment leaves no files; back-nav preserves answers

## 4. Docs, versioning, release

- [x] 4.1 PRD §11 delta row (new capabilities; not-contains extends FR-11, badges extend FR-3); CHANGELOG under 0.7.0; README bullet
- [ ] 4.2 Full verify pass over spec scenarios, feature-branch PR, human gate, merge, tag v0.7.0, archive (sync both new capability specs)
