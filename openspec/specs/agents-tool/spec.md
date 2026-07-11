# agents-tool

## Purpose
First-class listing, editing, validation, and deploy visibility for agent definitions in the configured agents directory.
## Requirements
### Requirement: Agents tool lists the configured directory's agents
The app SHALL provide an Agents page at `/agents` listing every `*.md` file (excluding `README.md`) in the configured agents directory: name, description preview, declared tools, health badge, and a deploy badge against `~/.claude/agents` distinguishing symlinked (always current), copy in sync, copy differs, and not deployed. Unconfigured directory shows a Settings link.

#### Scenario: Listing with deploy styles
- **WHEN** the agents directory contains `implementer.md` and `~/.claude/agents/implementer.md` is a symlink to it
- **THEN** the list shows implementer with a "symlinked" deploy badge

### Requirement: Agent editor with full-fidelity round-trips
Selecting an agent SHALL open an editor populated from its file: frontmatter form (name locked on edit, description with live length feedback, tools, optional model) plus body editor. Saving SHALL rewrite only the modeled fields; unknown frontmatter keys SHALL survive untouched. Creating a new agent SHALL write `<name>.md` with kebab-case-validated name, refusing collisions.

#### Scenario: Unknown frontmatter preserved
- **WHEN** an agent's frontmatter contains a key the form doesn't model and the user edits the description and saves
- **THEN** the rewritten file retains that key and value

### Requirement: Structural validation
On save the server SHALL reject (400): name not kebab-case or not equal to the filename, empty description, empty body. It SHALL return warnings (not blocking) for descriptions outside the 200–1500 band and for tools entries not in the known-tool catalog.

#### Scenario: Unknown tool warned
- **WHEN** an agent is saved with tools "Read, Grpe"
- **THEN** the save succeeds with a warning naming "Grpe" as unrecognized

### Requirement: Agent saves are versioned with history and restore
When the agents directory resolves inside a git repository, agent editor saves SHALL go through the toolkit-versioning choreography, and the agent editor SHALL offer the history/restore panel per the `toolkit-versioning` capability.

#### Scenario: Agent edit is versioned
- **WHEN** an agent is saved in a git-tracked agents directory
- **THEN** a commit exists containing exactly the agent file and `versions.json`, with a bumped patch version

