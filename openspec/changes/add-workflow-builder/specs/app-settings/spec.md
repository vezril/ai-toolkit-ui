## ADDED Requirements

### Requirement: Configurable workflows directory
The Settings page SHALL provide a "Workflows directory" field accepting an absolute path to an existing directory (e.g. `/Users/cference/Code/claude-toolkit/workflows`), persisted in `~/.ai-toolkit-ui/settings.json`, validated like the skills directory (absolute, exists, is a directory; invalid values rejected retaining the previous). Clearing it disables the Workflows tool, which then links to Settings.

#### Scenario: Setting the workflows directory
- **WHEN** the user saves a valid workflows directory path
- **THEN** `/workflows` lists that directory's workflow scripts without a restart
