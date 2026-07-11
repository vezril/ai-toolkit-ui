## ADDED Requirements

### Requirement: Guided setup entry point
The dashboard SHALL offer a "Guided setup" action beside "New evaluation" linking to `/guide`. The wizard SHALL present five stages — Purpose, Success, Failure, Evidence, Calibrate — each individually skippable, with progress indication and back-navigation that preserves entered answers.

#### Scenario: Entry and navigation
- **WHEN** the user opens `/guide`, answers stage 1, skips stage 3, and navigates back from stage 4
- **THEN** stage 1's answer is preserved and stage 3 remains skippable without data loss

### Requirement: Answers map mechanically to a draft
The wizard SHALL map answers to an eval draft as follows: Purpose → the prompt text (with `{{request}}` guidance); each Success line → an AI-judge rubric check with an auto-slugged metric label; each Failure "must never appear" line → a must-NOT-contain check; each Failure "failure mode" line → a rubric check phrased as the absence of that failure; each Evidence input (easy/hard/ambiguous) → a test case carrying the mapped checks; Calibrate selections → weight 2 / threshold 0.7 on load-bearing criteria and weight 1 / threshold 0.5 on the rest.

#### Scenario: Success lines become rubric checks
- **WHEN** the Success stage contains the line "Includes at least one working code example"
- **THEN** the resulting draft has a rubric check with that criterion and a metric like `working-code-example` on each test case

#### Scenario: Never-appear lines become not-contains checks
- **WHEN** the Failure stage lists "TODO" under must-never-appear
- **THEN** each test case carries a must-NOT-contain check for "TODO"

### Requirement: Wizard ends in the builder and owns no persistence
Completing (or skipping to the end of) the wizard SHALL open the eval builder pre-populated with the mapped draft. The wizard SHALL NOT write any file; saving remains the builder's existing action. Abandoning the wizard SHALL leave no artifacts.

#### Scenario: Handoff
- **WHEN** the user finishes the wizard
- **THEN** the browser is on `/new` with name, prompt, test cases, and checks populated from the answers, and nothing has been written to disk until Save is clicked
