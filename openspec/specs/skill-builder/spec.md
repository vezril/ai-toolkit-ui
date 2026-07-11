# skill-builder

## Purpose
Authoring, validation, quick-fixing, and eval-bridging for Agent Skills in the configured skills directory, with full-fidelity round-trips of hand-authored files.
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

### Requirement: A/B eval creation from a skill
The skill editor SHALL offer a "Create A/B eval" action alongside the standard create action. It SHALL generate a two-prompt eval: the with-skill prompt (identical to the standard generation) and a baseline prompt using the same template with the skill block omitted, plus a seeded Blind A/B winner check whose criterion references the skill's guidance, in addition to the standard seeded rubric check. Skill sync SHALL continue to regenerate only the with-skill prompt file; the baseline prompt and the config SHALL NOT be modified by sync.

#### Scenario: A/B generation
- **WHEN** the user clicks "Create A/B eval" on the skill `tdd`
- **THEN** `evals/skill-tdd.prompt.md` (with skill), `evals/skill-tdd.baseline.prompt.md` (no skill block), and a config listing both prompts with a seeded select-best check exist, and the browser lands in the eval builder

#### Scenario: Sync ignores the baseline arm
- **WHEN** the tdd skill is edited and "Sync skill → eval" is invoked on an A/B eval
- **THEN** the with-skill prompt file is regenerated and both the baseline prompt file and the config are byte-identical to before

### Requirement: Mechanical findings offer verified quick-fixes
For a skill's health findings of the mechanical class, the system SHALL compute quick-fixes server-side and offer them per finding: (a) frontmatter that fails to parse due to an unquoted colon in a scalar value → quote the offending line, offered only when the repaired text verifiably parses; (b) frontmatter `name` missing or not equal to the directory name → set it to the directory name; (c) an unresolved `[[link]]` with a sibling skill at Levenshtein distance ≤ 2 → replace with that sibling; unresolved links with no close sibling SHALL only offer unwrapping (brackets removed, text kept). Judgment-class findings (description length, empty body) SHALL NOT offer a quick-fix.

#### Scenario: Broken frontmatter quotable
- **WHEN** a skill's description contains an unquoted `skills: a, b` sequence making the YAML unparseable
- **THEN** the health panel offers a fix whose applied result parses, with only the description line changed

#### Scenario: No fix without a safe repair
- **WHEN** frontmatter fails to parse for a reason line-quoting cannot repair
- **THEN** no Fix button is offered for that finding — only the editor itself

#### Scenario: Distant link gets no guess
- **WHEN** `[[completely-unrelated]]` resolves to no sibling within distance 2
- **THEN** the only offered action is unwrapping the link, never a replacement suggestion

### Requirement: Fixes preview as an inline diff and apply explicitly
Each offered fix SHALL present an inline before/after diff of exactly the lines it would change; the file SHALL NOT be modified until the user clicks Apply on that diff. Preview and apply SHALL be produced by the same server-side computation.

#### Scenario: Nothing writes on preview
- **WHEN** the user expands a fix's diff and navigates away
- **THEN** the skill file on disk is unchanged

#### Scenario: Apply changes only the diffed lines
- **WHEN** the user applies the name-sync fix
- **THEN** the file differs from its previous content only on the `name:` line

### Requirement: Stale previews cannot apply
Each fix preview SHALL carry a hash of the file content it was computed against; Apply SHALL be rejected with a clear error when the file has changed since the preview, requiring a re-preview.

#### Scenario: Concurrent edit guarded
- **WHEN** a fix is previewed, the skill is edited elsewhere, and Apply is then clicked
- **THEN** the API rejects the apply naming the stale preview and no write occurs

### Requirement: Skill saves are versioned with history and restore
When the skills directory resolves inside a git repository, skill editor saves (including quick-fix applies) SHALL go through the toolkit-versioning choreography, and the skill editor SHALL offer the history/restore panel per the `toolkit-versioning` capability.

#### Scenario: Quick-fix apply is versioned
- **WHEN** a quick-fix is applied to a skill in a git-tracked skills directory
- **THEN** a commit exists containing exactly the skill file and `versions.json`, with a bumped patch version

