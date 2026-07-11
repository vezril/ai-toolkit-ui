# run-guardrails

## Purpose
Bounds on in-flight eval runs: one run per config, a global concurrency cap, and a process-group-killing timeout — because runs invoke paid AI services.

## Requirements

### Requirement: One in-flight run per config
Starting a run for a config that already has a run in `running` status SHALL be rejected with an error naming the config and the in-progress run; no child process is spawned. Runs of other configs are unaffected.

#### Scenario: Double-click guarded
- **WHEN** a run of `evals/foo.config.yaml` is in `running` status and Run is clicked again for the same config
- **THEN** the API rejects the second start with "already in progress", the Run button shows the message inline, and exactly one child process exists

### Requirement: Global concurrency cap
The number of simultaneously `running` runs across all configs SHALL be capped by the configured maximum (default 2). A start that would exceed the cap SHALL be rejected with an error naming the cap and the running count.

#### Scenario: Cap enforced
- **WHEN** the cap is 2, two runs are in flight, and a third config's Run is clicked
- **THEN** the third start is rejected naming the cap; it succeeds once one of the two finishes

### Requirement: Run timeout terminates hung processes
Each spawned run SHALL be subject to the configured timeout (default 15 minutes; 0 disables). On expiry the child process SHALL be terminated (graceful signal, escalating to SIGKILL if it does not exit within a grace period), the run SHALL be marked `failed`, and the log SHALL record that the timeout fired.

#### Scenario: Hung run reaped
- **WHEN** the timeout is set to a small value and a run's provider never returns
- **THEN** the run transitions to `failed` at the timeout with a "timed out" note in its log, and no promptfoo child process remains

#### Scenario: Timeout disabled
- **WHEN** the timeout setting is 0
- **THEN** runs are never reaped by the timeout mechanism

### Requirement: Guardrails apply at start time from current settings
Guard, cap, and timeout values SHALL be read from settings when each run starts — changes in Settings apply to subsequently started runs without an app restart, and never retroactively alter runs already in flight.

#### Scenario: Setting change picks up
- **WHEN** the cap is raised from 2 to 3 in Settings
- **THEN** the next start attempt is evaluated against 3, without restarting the server
