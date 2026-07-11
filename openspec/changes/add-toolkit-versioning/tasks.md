## 1. Git module + registry (server)

- [x] 1.1 Create `lib/git.ts` (ADR-0011): allowlisted verbs only (`isRepo`, `logFollow`, `show`, `addAndCommit` with explicit pathspecs, `pushToShipBranch` via `HEAD:refs/heads/toolkit-ui-ship --force-with-lease`, `pendingCount`); every path validated inside a configured root; spawned `git` per call, cwd = component root
- [x] 1.2 Create `lib/versions.ts`: per-directory `versions.json` read/seed/bump (auto-patch); commit-message version stamps as the sha↔version join
- [x] 1.3 Wire the choreography into the write paths of `lib/workflows.ts`, `lib/skills.ts` (incl. quick-fix applies), `lib/agents.ts`: write → bump → scoped add → commit; skip cleanly when not a repo
- [x] 1.4 Verify by scripted git fixture repo (scratch clone, NOT claude-toolkit): scoped commit alongside planted unrelated dirty files; version stamps; restore-forward incl. dirty-file pre-commit; degradation in a non-git dir; ship push creates the remote branch (use a local bare remote fixture)

## 2. History, restore, ship (UI + API)

- [x] 2.1 History/restore API (`GET /api/versions?type=&name=`, `POST /api/versions/restore`); Ship API (`POST /api/ship?type=`) + pending count on `GET /api/settings` or a status endpoint
- [x] 2.2 History/restore panels on the three editors (workflows/skills/agents); Ship button with pending-commit count; version-aware sync badges on the workflows list (`deployedVersion` recorded at sync)
- [x] 2.3 Verify in browser on the fixture repo: edit → history grows; restore v1 → forward commit; badges show local vs deployed versions

## 3. Hand-written workflow editing

- [x] 3.1 Raw-source tab (FileEditor) on hand-written workflows; meta-surgery form (description/whenToUse/phases) via the balanced-brace region replace, body-byte-identity asserted post-save
- [x] 3.2 Verify: meta edit on a fixture hand-written workflow → meta changed, body byte-identical, version committed; raw tab save versioned

## 4. Docs, versioning, release

- [x] 4.1 ADR-0011 (git execution boundary); PRD §11 delta row; CHANGELOG under 0.13.0; README
- [ ] 4.2 Full verify pass over spec scenarios, feature-branch PR, human gate, merge, tag v0.13.0, archive (materialize `toolkit-versioning`, append the three component deltas)
