## Why

UI edits to toolkit components (workflows, skills, agents) are naked writes: no version identity, no restore path short of the terminal, and no record of what's deployed to `~/.claude`. The toolkit repo is already the source of truth — this change makes the app drive it: every save becomes a scoped git commit with a semver stamp, history and restore become one-click, and shipping accumulates into a PR that respects the repo's protected main. It also unlocks the deferred half of "editing existing workflows": hand-written scripts gain safe raw-source and meta editing, because every write is now versioned and restorable.

## What Changes

- **Git choreography on every UI save** (workflows, skills, agents — requires `add-agents-tool`): write file(s) → auto-bump **patch** in the component directory's `versions.json` → `git add` **only the files the app wrote** (the user's unrelated dirty files are never swept in) → `git commit` on the current branch. No branch switching, ever.
- **`versions.json` per component directory**: current semver per component, the commit it maps to, and `deployedVersion` for copy-style `~/.claude` twins (symlink-style deploys show "symlinked — always current"). Committed alongside every change, so the registry itself is versioned.
- **History & Restore** per component: `git log --follow` renders a version list (semver, date, message); Restore copies the selected version **forward** as a new commit ("restored from vX.Y.Z") — never a checkout into the past; a dirty target file is auto-committed first so nothing is ever lost.
- **Ship action**: `git push origin <current-branch>:toolkit-ui-ship` (no local branch switch; side branch clears the protected-main ruleset) + `gh pr create` — batching all accumulated app commits into one gated PR. Merge stays the user's; merge-commit recommended over squash to keep local main an ancestor.
- **Hand-written workflow editing** (the original ask, now safe): a raw-source tab and a meta-surgery form (description / whenToUse / phase titles+details edited structurally; the body untouched) on hand-written workflows — every save versioned like everything else.
- **Degradation** (decided): a component directory outside a git repo behaves exactly as today — plain writes, versioning UI hidden.

## Capabilities

### New Capabilities
- `toolkit-versioning`: the git module and its allowlist, versions.json semantics, save-commit choreography, history/restore, Ship, degradation.

### Modified Capabilities
- `workflow-builder`: ADDED — raw-source tab and meta-surgery editing for hand-written workflows; version-aware sync badges.
- `skill-builder`, `agents-tool`: ADDED — versioned saves, history/restore panels (one requirement each, referencing `toolkit-versioning`).

## Impact

- **Server:** new `lib/git.ts` — the app's **first git execution** (new ADR): allowlisted verbs only (`rev-parse`, `status --porcelain`, `log --follow`, `show`, `add <paths>`, `commit -m`, `push origin <ref>:<ref>`), spawned per invocation, cwd = the component root's repo, paths validated inside the configured roots; `gh pr create` reuses the existing CLI trust. `lib/versions.ts` (registry read/bump). Write paths of `lib/workflows.ts`, `lib/skills.ts`, `lib/agents.ts` gain the choreography.
- **UI:** history/restore panels on the three editors; Ship button + pending-commit count on a shared surface (Settings or the sidebar footer); workflow raw/meta editing.
- **Docs:** PRD §11 delta row; ADR-0011 (git execution boundary); CHANGELOG under **v0.13.0**. **Dependencies:** none (system git + gh, both already required).
