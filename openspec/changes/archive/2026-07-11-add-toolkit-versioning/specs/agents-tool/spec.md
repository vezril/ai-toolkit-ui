## ADDED Requirements

### Requirement: Agent saves are versioned with history and restore
When the agents directory resolves inside a git repository, agent editor saves SHALL go through the toolkit-versioning choreography, and the agent editor SHALL offer the history/restore panel per the `toolkit-versioning` capability.

#### Scenario: Agent edit is versioned
- **WHEN** an agent is saved in a git-tracked agents directory
- **THEN** a commit exists containing exactly the agent file and `versions.json`, with a bumped patch version
