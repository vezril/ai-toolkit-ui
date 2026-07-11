# eval-coach

## Purpose
Advisory structural heuristics over eval configs and drafts, surfaced live in the builder and as dashboard badges, with inline refinement for content-gap findings.

## Requirements

### Requirement: Static structural heuristics for evals
The system SHALL provide an eval coach: a set of static heuristics evaluating an eval's structure and returning advisory findings (message + the principle it derives from, one line each). The initial catalog SHALL include: only one test case; no failure-mode or negative (not-contains) check; no deterministic check (every check needs a judge); all rubric thresholds at the 0.5 default; all weights equal; rubric criteria phrased non-observably (e.g. starting "is good/clear/helpful"); seeded placeholder input text still present. Findings SHALL never block saving or running.

#### Scenario: Uncalibrated eval flagged
- **WHEN** an eval has three rubric checks, all threshold 0.5 and weight 1
- **THEN** the coach returns findings for uncalibrated thresholds and undifferentiated weights, and the eval remains fully saveable and runnable

### Requirement: Live coach panel in the builder
The eval builder SHALL show a coach panel reflecting the current draft, updating as the draft changes, listing findings tersely with the underlying principle.

#### Scenario: Findings clear as the draft improves
- **WHEN** a draft with one test case gains a second test case
- **THEN** the "only one test case" finding disappears from the panel without saving

### Requirement: Structure badges on dashboard config cards
Every dashboard config card (builder-generated and hand-written alike) SHALL show a structure badge derived from the coach: "✓ structure" when no findings, else the finding count, with the findings enumerated on the config page or on hover.

#### Scenario: Hand-written config graded
- **WHEN** the dashboard lists a hand-written config whose tests all use rubric checks at default thresholds
- **THEN** its card shows a coach findings count (not an error state), and the config remains runnable

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
