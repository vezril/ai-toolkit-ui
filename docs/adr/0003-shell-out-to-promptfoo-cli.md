# ADR-0003: Shell out to `npx promptfoo eval` as a child process, rather than using promptfoo as a library

**Status:** Accepted (retroactive)

## Context

Running an eval requires invoking promptfoo's evaluation engine. promptfoo ships both a CLI and (in principle) could be imported as a library for tighter in-process integration with progress callbacks, typed results, etc.

## Decision

`lib/runs.ts` spawns `npx promptfoo eval --no-cache --config <abs> --output <abs>` as an OS child process (Node `child_process.spawn`), with `cwd = REPO_ROOT` and `FORCE_COLOR=0`, and captures stdout/stderr as an opaque text stream plus exit code. The UI never imports promptfoo's internals; it only knows the CLI's argument shape and the shape of the `--output` JSON file it produces.

## Consequences

- The UI stays decoupled from promptfoo's internal API surface and versioning — it only depends on a stable-ish CLI contract (flags + output file), which is far less likely to break across promptfoo upgrades than an internal library API would be.
- This directly satisfies the PRD non-goal "Replacing the promptfoo CLI" — the UI is explicitly a wrapper, not a reimplementation of evaluation/grading logic.
- The trade-off: all progress/status information is limited to whatever's observable externally — raw log text and a process exit code. There's no structured progress ("3 of 10 tests done"), no typed error from promptfoo, and success/failure has to be inferred heuristically: the code treats a non-zero exit code as *not* a failure as long as an output file exists, because promptfoo exits non-zero whenever any assertion fails (FR-18) — this heuristic is correct today but is coupled to promptfoo's current exit-code convention and would silently misclassify runs if that convention changed.
- Because the child process is unsupervised beyond stdout/stderr/exit listeners, there is no timeout — a hung provider CLI (network stall, waiting on interactive input) will run and accumulate log text indefinitely, capped only by the 2,000,000-character log buffer (see architecture.md Risk R-3).
- No concurrency limit exists on how many child processes can be spawned — every Run click spawns immediately regardless of how many runs are already in flight.
- The results JSON contract (`--output`) is promptfoo's own, external, and versioned independently of this app; schema drift there is absorbed defensively in `lib/results.ts` (see architecture.md Risk R-1 / PRD OQ-5).
