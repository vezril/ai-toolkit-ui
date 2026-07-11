## ADDED Requirements

### Requirement: Configurable agents directory
The Settings page SHALL provide an "Agents directory" field (absolute path to an existing directory, e.g. `/Users/cference/Code/claude-toolkit/agents`), validated and persisted like the skills and workflows directories; clearing it disables the Agents tool.

#### Scenario: Setting the agents directory
- **WHEN** the user saves a valid agents directory path
- **THEN** `/agents` lists that directory's agents without a restart
