## ADDED Requirements

### Requirement: Skill saves are versioned with history and restore
When the skills directory resolves inside a git repository, skill editor saves (including quick-fix applies) SHALL go through the toolkit-versioning choreography, and the skill editor SHALL offer the history/restore panel per the `toolkit-versioning` capability.

#### Scenario: Quick-fix apply is versioned
- **WHEN** a quick-fix is applied to a skill in a git-tracked skills directory
- **THEN** a commit exists containing exactly the skill file and `versions.json`, with a bumped patch version
