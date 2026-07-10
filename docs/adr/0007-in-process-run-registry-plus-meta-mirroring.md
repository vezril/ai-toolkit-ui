# ADR-0007: In-process run registry on `globalThis`, mirrored to `meta.json`, instead of a job queue or database

**Status:** Accepted (retroactive)

## Context

Started runs need live, low-latency state (status, accumulating log) available to the polling run page, and that state needs to survive Next.js dev-mode Hot Module Replacement (which reloads route-handler modules without restarting the Node process) without losing an in-flight run — while also needing to survive an actual server restart with a truthful (not falsely-"running") status, per NFR-4.

## Decision

`lib/runs.ts` keeps a `Map<string, Run>` attached to `globalThis` (`globalThis.__promptfooRuns`) as the sole holder of live run state, including the full log text. On every state transition (start, completion, failure), the metadata portion (everything except the log) is mirrored to `eval-runs/<id>.meta.json`. `listRuns()`/`getRun()` merge live entries (which win) with persisted `.meta.json` entries, and any `.meta.json` still marked `running` with no corresponding live entry is deterministically reclassified `failed` with a placeholder log.

## Consequences

- Solves the specific problem it was built for: HMR-safe live state without a database, and durable-enough history without a job-queue system — appropriate for a single Node process with no horizontal scaling ambition.
- Log text is process-memory-only, capped at 2,000,000 characters (FR-19) and never persisted — the tightest coupling in the system between "useful live experience" and "state that vanishes on restart," and it is an explicit, accepted loss (NFR-4 states only the log is lost, everything else survives).
- Because the registry lives on `globalThis` rather than behind any locking or singleton-instance guarantee, running two instances of the dev/prod server against the same `REPO_ROOT` at once produces two independent registries racing to write the same `meta.json` files (architecture.md Risk R-2) — the design implicitly assumes exactly one server process per target project at a time, an assumption that is nowhere enforced in code.
- There is no run queue and no concurrency limit — the registry tracks however many runs are started, with no back-pressure (architecture.md Risk R-3); this ADR's scope was "make state durable and HMR-safe," not "govern concurrency," and that gap remains open.
- Because `resolveRepoPath`/config lookups happen inside `startRun` itself, a run can only be started against a config that already passes the same sandbox check as file editing — there's no separate authorization model for runs vs. file access.
