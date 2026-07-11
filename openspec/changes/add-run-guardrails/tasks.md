## 1. Settings: run guardrails

- [x] 1.1 `lib/settings.ts`: `runGuardrails` field (defaults 2 / 15; validation: integer ≥ 1, number ≥ 0), getter used by runs; `/api/settings` GET includes it, PUT accepts `{ runGuardrails }`; Settings page gains a Runs card with the two fields
- [x] 1.2 Verify by API: defaults returned when unset; valid update persists; `maxConcurrentRuns: 0` and negative timeout rejected 400 retaining prior values

## 2. Guards + timeout (lib/runs.ts)

- [x] 2.1 `startRun`: reject when a live run for the same config is `running`; reject when running count ≥ cap (error copy names the cap and count); read settings at start time
- [x] 2.2 Per-child timeout: timer from `runTimeoutMinutes` (0 = off), on fire log a timed-out note, SIGTERM → 5s → SIGKILL; clear timer in the close handler
- [x] 2.3 Verify with a slow echo provider (sleep script): double-start same config rejected while first runs; third concurrent run rejected at cap 2 then succeeds after a finish; tiny timeout (0.05 min) reaps a hung run → `failed` with the timeout note and no leftover process; timeout 0 never reaps; clean up scratch artifacts

## 3. Docs, versioning, release

- [x] 3.1 architecture.md: mark R-3 mitigated (pointer to this change, residual noted); PRD §11 delta row; CHANGELOG under 0.8.0; README note in the runs bullet
- [ ] 3.2 Full verify pass over spec scenarios, feature-branch PR, human gate, merge, tag v0.8.0, archive (materialize `run-guardrails`, append to `app-settings`)
