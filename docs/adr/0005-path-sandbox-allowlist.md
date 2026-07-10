# ADR-0005: Path sandbox — extension allowlist plus blocked-segment list, not a full authorization model

**Status:** Accepted (retroactive)

## Context

Every file-touching API route (`/api/file`, `/api/evals`, `/api/runs`'s config lookup) accepts a relative path from the client and must not let that path escape the target project, hit sensitive directories, or read/write file types the UI has no business touching — while still being simple enough to implement and audit as a single function, appropriate for a local-only, single-user, no-auth tool (NFR-1).

## Decision

`resolveRepoPath` (`lib/paths.ts`) is the single choke point for all file access: it resolves the path relative to `REPO_ROOT`, rejects anything that resolves outside `REPO_ROOT + path.sep`, rejects any path containing a blocked segment (`node_modules`, `.git`, `webui`, `eval-runs`), and rejects any extension not in an allowlist (`.md`, `.yaml`, `.yml`, `.js`, `.json`). Every route that touches the filesystem on a client-supplied path calls this function first (NFR-3).

## Consequences

- A single, small, unit-testable function is the entire security boundary for file access — easy to reason about and easy to verify (NFR-3's verification method is literally "try three bad paths, confirm 400").
- This protects against *accidental* bugs — a typo'd path, a client sending `../../whatever` by mistake — not against a hostile actor with the ability to set `PROJECT_ROOT` or plant a malicious config, both of which are explicitly out of scope (A2): the sandbox assumes `PROJECT_ROOT` itself is trusted.
- The allowlist is coarse: `.js` is permitted (needed so provider runner scripts and config-adjacent JS can be viewed/edited), which means the sandbox does not distinguish "a `.js` file that's a harmless promptfoo helper" from "a `.js` file that, if edited and later executed by something else, could do anything" — the sandbox controls *what path* can be touched, not *what happens* once written, which is out of this app's control by design (see Non-goal: "Editing or generating the provider runner scripts themselves").
- **Known asymmetry (undecided, tracked as OQ-4):** `lib/configs.ts`'s directory *scan* additionally skips `docs/` (so `.yaml` there never appears as a discoverable config), but `lib/paths.ts`'s *access* block list does not include `docs` — a `.yaml` file under `docs/` is invisible to the dashboard yet still directly readable/writable via `GET/PUT /api/file`. This is recorded as observed behavior, not corrected here, because intent is unknown.
- Blocked segments and allowed extensions are hardcoded constants, not configurable — extending them (e.g., to support a 6th file type) is a code change.
