# eval-coach

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
