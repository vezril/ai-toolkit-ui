# skill-builder

## Requirements

### Requirement: Skills tool lists the configured directory's skills
The app SHALL provide a Skills page at `/skills` listing every direct child directory of the configured skills directory that contains a `SKILL.md`, showing each skill's name, a description preview, and structural-health badges (valid / has warnings / has errors). When no skills directory is configured, the page SHALL show a prompt linking to Settings instead of a listing.

#### Scenario: Listing skills
- **WHEN** the skills directory is set to a directory containing `tdd/SKILL.md` and `clean-code/SKILL.md`
- **THEN** `/skills` lists `tdd` and `clean-code` with description previews and health badges

#### Scenario: Unconfigured directory
- **WHEN** no skills directory is set in Settings
- **THEN** `/skills` shows an explanation with a link to `/settings` and no listing

### Requirement: Skill create form with best-practice guidance
The Skills page SHALL offer a create form with: a kebab-case skill name (the directory name — validated against `^[a-z0-9]+(-[a-z0-9]+)*$`, max 64 chars); a description textarea with inline guidance (write in third person, state what the skill covers AND when to use it, include concrete trigger phrases) and a live character count against the 200–1500 recommended band and 1024-char Agent Skills standard cap; a markdown body editor; and an Advanced section for optional frontmatter fields `disable-model-invocation` (boolean), `user-invocable` (boolean), `allowed-tools` (string), and `argument-hint` (string). Saving SHALL create `<skillsDir>/<name>/SKILL.md` with YAML frontmatter (`name`, `description`, plus any set advanced fields) followed by the body.

#### Scenario: Creating a skill
- **WHEN** the user saves a new skill named `release-notes` with a description and body
- **THEN** `<skillsDir>/release-notes/SKILL.md` exists with `name: release-notes` and the description in its frontmatter, and the body below the frontmatter

#### Scenario: Name collision refused
- **WHEN** the user saves a new skill whose name matches an existing skill directory
- **THEN** the API responds 400 with an "already exists" error and no files change

### Requirement: Skill edit round-trip
Selecting an existing skill SHALL open the same form populated from its `SKILL.md` (frontmatter fields into the corresponding inputs, body into the editor); saving SHALL rewrite only that skill's `SKILL.md`, preserving unknown frontmatter fields it does not model (they round-trip untouched).

#### Scenario: Editing preserves unknown frontmatter
- **WHEN** a skill's frontmatter contains `license: MIT` (not a form field) and the user edits the description and saves
- **THEN** the rewritten `SKILL.md` contains the new description AND still contains `license: MIT`

### Requirement: Structural validation with errors and warnings
On save the server SHALL validate: (errors — reject with 400) name matches the kebab-case pattern and equals the directory name, description non-empty, body non-empty, no nested `SKILL.md` would be created; (warnings — returned with the success response and shown inline) description shorter than 200 or longer than 1500 characters, description over the 1024-char standard cap, and `[[link]]` references that do not resolve to a sibling skill directory.

#### Scenario: Error blocks save
- **WHEN** a draft is saved with the name `Bad_Name`
- **THEN** the API responds 400 naming the kebab-case rule and no file is written

#### Scenario: Warning does not block save
- **WHEN** a draft is saved whose description is 80 characters
- **THEN** the skill is written and the response includes a warning that the description is below the recommended 200-character band

### Requirement: Skill file access is sandboxed to the configured skills directory
All skill read/write operations SHALL resolve paths against the configured skills directory and reject any path that escapes it (traversal, absolute-path injection, symlinked parents resolved outside). Skill operations SHALL NOT be able to read or write through the eval sandbox's `REPO_ROOT`, and eval file APIs SHALL NOT reach the skills directory.

#### Scenario: Traversal rejected
- **WHEN** a skill save is requested with name `../../etc`
- **THEN** the API responds 400 and nothing outside the skills directory is touched

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
