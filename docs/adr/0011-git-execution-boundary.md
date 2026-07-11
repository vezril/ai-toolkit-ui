# ADR-0011: Git execution boundary — allowlisted verbs, scoped pathspecs, no tree movement

**Status:** Accepted

## Context

Toolkit versioning (v0.13.0, `add-toolkit-versioning`) makes the component repo the source of truth: every UI save becomes a commit, history and restore are one click, and edits ship as a gated PR. This is the app's first execution of git — until now its process-spawning surface was promptfoo runs (ADR-0003) and `gh` for nothing (the PR CLI arrives here too). The user's real toolkit tree works dirty on a protected main branch, so the boundary must guarantee the app can neither disturb in-progress hand edits nor fight the branch protection.

## Decision

All git execution lives in `lib/git.ts`, a closed allowlist of one function per verb: `rev-parse` (repo detection/toplevel), `status --porcelain` (single-file dirty check), `log --follow`, `show <sha>:<path>`, `add -- <explicit paths>` + `commit --only -m -- <explicit paths>`, `rev-list --count` (pending), and `push --force origin HEAD:refs/heads/toolkit-ui-ship`. Absent from the vocabulary entirely: `checkout`, `merge`, `rebase`, `stash`, `branch`, `pull`, `reset`. Every path argument must resolve inside the calling component's configured root. Commits happen on whatever branch the user's tree is on; shipping pushes `HEAD` to an app-owned side branch (clearing protected-main rulesets) and opens a PR via `gh`, degrading gracefully to push-only when `gh` or a GitHub remote is unavailable. Restore never checks out: old content is read with `show` and written forward as a new commit, with dirty files auto-committed first.

## Consequences

- The two safety invariants are structural, not behavioral: the app cannot move the working tree (no verb exists) and cannot sweep unrelated dirty files into its commits (`add`/`commit --only` with explicit pathspecs only) — both verified against a fixture repo with planted dirty files.
- Local commits interleave with the user's own on the shared branch; Ship pushes everything on HEAD, which is by design (the repo's truth ships). Squash-merging the ship PR diverges local history — merge-commit guidance is documented; the residual is a routine `git pull`.
- `--force` on the ship branch is safe only because the branch is app-owned by convention; a human also using `toolkit-ui-ship` would be clobbered. Accepted and named.
- Git identity, hooks, and signing come from the user's own git config — app commits are ordinary commits, indistinguishable in tooling.
- Degradation outside git repos is silent and total (plain writes, no versioning UI), keeping non-repo component directories first-class.
