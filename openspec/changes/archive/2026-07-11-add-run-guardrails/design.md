## Context

Baseline risk R-3 (architecture.md §7): unbounded concurrent `promptfoo eval` children, no per-child timeout — High, explicitly "a genuine gap, not an accepted trade." All run state lives in the `globalThis` registry (ADR-0007) with meta.json mirroring; `startRun` in `lib/runs.ts` is the single spawn site; `RunButton` already renders API errors inline. Settings (ADR-0009's store) already handles typed fields with server-side validation.

## Goals / Non-Goals

**Goals:**
- Close R-3 with the register's own recommended shape: per-config guard + small global cap + spawn timeout. ~Tens of lines in `lib/runs.ts`, no new architecture.
- Both knobs in Settings, applied at start time, no restart.

**Non-Goals:**
- A job queue, run scheduling, or waiting/retry semantics — a rejected start is a rejected start; the user re-clicks when ready.
- Cross-instance coordination (R-2's single-instance assumption stands).
- Retroactive application of setting changes to in-flight runs.
- Cost estimation/budgets (the guard bounds concurrency, not spend per run).

## Decisions

1. **Guards live in `startRun`, checked against the live registry** — `runs.values()` filtered to `status === 'running'`: same-config match ⇒ "already in progress" error; count ≥ cap ⇒ cap error. In-memory only: meta.json entries marked running with no live entry are dead (server restarted), and `listRuns` already reclassifies them — they must not count against the cap.
2. **Rejection is a thrown error → existing 400 path** — `/api/runs` POST already maps thrown errors to `{error}` responses and `RunButton` renders them inline. No new UI plumbing; the error copy is the UX.
3. **Timeout via `setTimeout` per child, stored on the run record** — on fire: log note, `child.kill('SIGTERM')`, 5s grace, then `SIGKILL`. The existing `close` handler runs the normal failure path (no output file ⇒ `failed`), so the timeout needs no separate state transition — it just guarantees `close` eventually happens. Timer cleared in the close handler. Minutes accepted as decimals (0.05 ≈ 3s) which also makes the reap path cheaply testable.
4. **Settings shape**: `runGuardrails: { maxConcurrentRuns: number; runTimeoutMinutes: number }` in settings.json, absent ⇒ defaults (2 / 15). Validation: integer ≥ 1; number ≥ 0. Read inside `startRun` per start (decision: no caching — settings reads are one small JSON file).
5. **Architecture doc updated in-change** — R-3's row gets "Mitigated in v0.8.0 (`add-run-guardrails`)" with the residual noted (no cross-instance coordination, per R-2).

## Risks / Trade-offs

- [SIGTERM ignored by npx/promptfoo process tree] → escalation to SIGKILL after 5s; promptfoo children are killed with the parent group on most setups, but a leaked grandchild is possible — acceptable residual, noted in the log message. (Killing the process group outright is platform-varying; not worth the complexity at one user.)
- [Guard races: two POSTs in the same tick] → Node's single-threaded event loop serializes `startRun` bodies; registry insert happens synchronously before spawn, so the second POST sees the first. No locking needed.
- [Cap frustrating legitimate parallel use] → it's a Settings knob; raise it deliberately rather than never having a ceiling.

## Migration Plan

Single PR, **v0.8.0** (minor). Absent settings fall back to defaults — existing behavior changes only in that the new limits exist. Rollback = revert.

## Open Questions

- None — scope was settled in the risk register's recommendation and the preceding discussion.
