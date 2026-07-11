## Why

Risk R-3 in the baseline architecture — the register's only High rated "genuine gap, not an accepted trade" — is still open: nothing limits how many `promptfoo eval` child processes run at once, and a hung provider CLI runs forever. Runs invoke metered AI services; NFR-7 guards *starting* them but nothing bounds what an already-started situation can spend. Impatient re-clicking during iterative EDD (the realistic usage pattern) can stack paid runs silently.

## What Changes

- **Per-config guard**: starting a run for a config that already has a run in `running` status is rejected with a clear error ("a run for this config is already in progress"), surfaced inline by the existing Run buttons.
- **Global concurrency cap**: at most N runs in flight across all configs (default 2); the (N+1)th start is rejected naming the cap.
- **Spawn timeout**: each child process gets a timeout (default 15 minutes; 0 disables); on expiry the child is terminated (SIGTERM, escalating to SIGKILL), the run is marked failed, and the log records the timeout.
- **Settings → Runs section**: both knobs (max concurrent runs, run timeout in minutes) editable, applied to subsequently started runs without restart.
- Closes architecture risk R-3; the risk-register row is updated to point at the mitigation.

## Capabilities

### New Capabilities
- `run-guardrails`: the per-config guard, global concurrency cap, and spawn timeout.

### Modified Capabilities
- `app-settings`: ADDED requirement — run-guardrail settings (max concurrent runs, timeout), persisted alongside the existing settings.

## Impact

- **Server:** `lib/runs.ts` (guard + cap checks in `startRun`, per-child timeout with kill/escalate, log note); `lib/settings.ts` (two numeric settings with defaults + validation); `/api/runs` POST surfaces guard rejections as 409-style errors.
- **UI:** Settings page gains a Runs card; `RunButton` already renders API errors inline — no changes expected beyond verifying the message reads well.
- **Docs:** architecture.md R-3 row updated (mitigated, pointer to this change); PRD §11 delta row (extends FR-16/FR-18, NFR-7's spirit extended from "no accidental starts" to "bounded in-flight spend"); CHANGELOG under **v0.8.0**.
- **Dependencies:** none. Guards read the in-memory registry only (single-instance assumption per R-2 stands, unchanged).
