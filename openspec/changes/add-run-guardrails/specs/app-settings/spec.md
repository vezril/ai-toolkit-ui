## ADDED Requirements

### Requirement: Run-guardrail settings
The Settings page SHALL provide a Runs section with two numeric fields: maximum concurrent runs (integer ≥ 1, default 2) and run timeout in minutes (number ≥ 0, default 15, 0 = disabled), persisted in `~/.ai-toolkit-ui/settings.json`. Invalid values SHALL be rejected server-side with the previous values retained.

#### Scenario: Persisted and validated
- **WHEN** the user sets max concurrent runs to 3 and timeout to 30
- **THEN** `settings.json` reflects both values and they govern subsequently started runs

#### Scenario: Invalid value rejected
- **WHEN** the user submits a max concurrent runs of 0
- **THEN** the API responds 400 and the previous value is retained
