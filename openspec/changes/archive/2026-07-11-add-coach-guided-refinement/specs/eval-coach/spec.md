## ADDED Requirements

### Requirement: Refinable coach findings offer inline refinement forms
In the eval builder's coach panel, the four content-gap findings SHALL expand inline to a targeted form whose submission updates the draft in place (no file write until the builder's Save): too-few test cases → labeled inputs for a hard and an ambiguous case, each non-empty answer becoming a test case carrying copies of the first test's checks; no failure-mode check → a lines-textarea whose entries become must-NOT-contain checks on every test case; no deterministic check → a lines-textarea whose entries become contains checks on every test case; seeded placeholder input → a request input replacing that test case's request. Findings whose remedy is an existing builder control (thresholds, weights, criterion phrasing) SHALL remain advisory-only.

#### Scenario: Failure guard added everywhere
- **WHEN** the user expands the no-failure-mode finding, enters "TODO", and submits
- **THEN** every test case in the draft gains a must-NOT-contain "TODO" check, the finding disappears from the panel without saving, and the file on disk is unchanged until Save

#### Scenario: New test cases inherit checks
- **WHEN** a draft has one test case with three checks and the user submits a hard-case answer in the too-few-tests form
- **THEN** the draft gains a test case with that request, description "Hard case", and copies of the three checks

#### Scenario: Placeholder replaced in place
- **WHEN** the user submits a request in the placeholder-refinement form
- **THEN** the seeded test case's request becomes that text and no other test case changes

### Requirement: Skill evals hint the placeholder refinement from the skill's description
For evals with a `skill-<name>` slug, the placeholder-refinement form SHALL offer clickable hint chips extracted mechanically from that skill's description — quoted phrases and the "Use when…" clause — which insert into the request input when clicked. Extraction SHALL read through the existing skills sandbox and SHALL degrade to no chips (never an error) when the skill or its description is unavailable.

#### Scenario: Trigger phrases become chips
- **WHEN** the placeholder form opens for `evals/skill-tdd.config.yaml` and the tdd skill's description contains the quoted phrases "write tests" and "do TDD"
- **THEN** chips for those phrases appear and clicking one inserts its text into the request input

#### Scenario: Graceful absence
- **WHEN** the skills directory is unconfigured or the skill has no extractable phrases
- **THEN** the form renders without chips and without error
