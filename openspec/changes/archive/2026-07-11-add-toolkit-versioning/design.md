## Context

Explored across two rounds (2026-07-11), grounded in the real repo state: `claude-toolkit` main is protected by a `protect-main` ruleset; the user's working tree sits dirty on main (in-progress hand edits) with zero unpushed commits — landing happens via his `git-ship` PR pattern. `~/.claude` deploy styles are mixed: workflows are copies, skills/agents are symlinks. Decisions: repo as source of truth; auto-patch bumps; degradation outside git; all three component types (hence the `add-agents-tool` prerequisite); auto-push desired but blocked by protection → Ship-to-PR instead.

## Goals / Non-Goals

**Goals:**
- Every UI write versioned (semver + commit), restorable forward-only, shippable in batches through the protected-main discipline — without ever disturbing the user's live working tree.
- Hand-written workflows safely editable (raw + meta-surgery) now that writes are versioned.

**Non-Goals:**
- Auto-push per save (protected main makes it structurally impossible; Ship batches instead).
- `git merge`/rebase/checkout-branch operations; resolving conflicts; managing the user's own commits.
- Minor/major bump UI (auto-patch only in v1; the registry format carries full semver for later).
- Version history for eval configs in the target promptfoo project (different repo, different ownership — revisit separately).
- PR auto-merge (the gate is the point).

## Decisions

1. **`lib/git.ts` — allowlisted, spawned, scoped (ADR-0011).** One function per verb: `isRepo(dir)`, `logFollow(file)`, `show(rev, file)`, `addAndCommit(files[], message)`, `pushToShipBranch()`, `pendingCount()`. Each spawns `git` with `cwd` = the component root; every path argument must resolve inside a configured root. `commit` uses `--only` semantics via explicit pathspecs — the scoped-add guarantee is enforced by never running bare `git add .` or `git commit -a`. No `checkout`, no `merge`, no `stash`, no branch verbs at all.
2. **Restore = read old blob, write forward, save-commit.** `git show <sha>:<path>` → normal save path (bump + commit). The dirty-file case runs the same save path first ("uncommitted changes preserved as vX.Y.Z"). Linear history, zero time travel.
3. **`versions.json` lives per component directory** (workflows/, skills/, agents/), shape: `{ "<name>": { "version", "commit", "deployedVersion"? } }`. Bump-then-commit updates `commit` to the new sha via a second lightweight amend? No — amend rewrites; instead the registry stores the sha of the *previous* mapping and history rendering joins `git log` (authoritative shas) with version stamps parsed from commit messages (`workflow(name): v1.2.1 …`). Registry stays simple; messages are the sha↔version join key.
4. **Ship without branch switching**: `git push origin HEAD:refs/heads/toolkit-ui-ship --force-with-lease` (the ship branch is app-owned; force-with-lease keeps repeated ships coherent after merges), then `gh pr create --head toolkit-ui-ship` if none open. Merge-commit guidance documented (squash would orphan local ancestry).
5. **Symlink deploys short-circuit**: `deployedVersion` tracking applies only to copy-style twins; symlinks render "symlinked — always current" and sync actions hide.
6. **Meta-surgery on hand-written workflows** reuses the balanced-brace slicer: replace exactly the `meta` literal region with a re-serialized literal (JSON, valid JS), leaving every other byte alone — verified by asserting body-byte-identity in tests.

## Risks / Trade-offs

- [App commits interleave with the user's manual commits on main] → they're ordinary commits; Ship pushes whatever HEAD holds, which is exactly "the repo's truth". Scoped adds keep *content* separation even when history interleaves.
- [Squash-merging the ship PR diverges local main] → documented guidance (merge commit); worst case is a one-time `git pull --rebase` — the user's own daily git reality, not data loss.
- [Two sessions/tools committing concurrently] → git's own locking serializes; a failed commit surfaces as a save error with the file safely written.
- [Registry/message drift if the user hand-edits versions.json] → history join degrades to sha-only entries; advisory, never blocking.

## Migration Plan

Single PR, **v0.13.0**, after `add-agents-tool` ships. First save in each directory seeds `versions.json` at v1.0.0 per touched component. Rollback = revert the app; commits already made are ordinary git history, harmless.

## Open Questions
- None — settled across the explore rounds and the repo ground-truth check.
