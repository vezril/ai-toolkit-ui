## ADDED Requirements

### Requirement: Create an EDD eval from a skill
The skill editor and each skill's list card SHALL offer a "Create EDD eval" action. Invoking it SHALL generate, in the target promptfoo project, a builder-generated eval named `skill-<skill-name>` consisting of: a prompt file embedding the skill's description and body as loaded context above the `{{request}}` placeholder; and a config with one seeded test case containing a placeholder example input and at least one AI-judge check whose criterion references following the skill's guidance. After generation the app SHALL navigate to the eval builder opened on the new eval.

#### Scenario: Generating the eval
- **WHEN** the user clicks "Create EDD eval" on the skill `tdd`
- **THEN** `evals/skill-tdd.config.yaml` and `evals/skill-tdd.prompt.md` exist in the target project, the prompt file contains the tdd skill's body and `{{request}}`, and the browser lands on `/new?config=evals/skill-tdd.config.yaml`

#### Scenario: Generated eval is a normal builder eval
- **WHEN** the generated eval is opened in the eval builder
- **THEN** it round-trips like any builder-generated config (models, judge, tests all editable) and "Save & run test" runs it via the existing run pipeline

### Requirement: Sync skill changes into the eval without touching tests
When the eval for a skill already exists, the action SHALL present as "Sync skill → eval" and, on invocation, SHALL regenerate only the prompt file from the skill's current description and body — the config file (test cases, checks, models, judge) SHALL NOT be modified.

#### Scenario: Sync preserves refinements
- **WHEN** the user has added three test cases to `skill-tdd`, then edits the tdd skill's body, then clicks "Sync skill → eval"
- **THEN** `evals/skill-tdd.prompt.md` contains the updated body and `evals/skill-tdd.config.yaml` is byte-identical to before the sync

### Requirement: Staleness is surfaced
The skill editor SHALL indicate when a linked eval's prompt file predates the skill's last modification (i.e., the eval is testing an older version of the skill), prompting a sync.

#### Scenario: Stale eval flagged
- **WHEN** the tdd skill's SKILL.md is saved after the last generation/sync of `skill-tdd`
- **THEN** the skill editor shows a stale indicator on the eval action (e.g. "Sync skill → eval — skill changed since last sync")
