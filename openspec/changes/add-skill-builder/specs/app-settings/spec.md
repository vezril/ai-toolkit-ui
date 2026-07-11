## ADDED Requirements

### Requirement: Configurable skills directory
The Settings page SHALL provide a "Skills directory" field accepting an absolute path to the directory where Agent Skills live (e.g. `/Users/cference/Code/claude-toolkit/skills`), persisted in `~/.ai-toolkit-ui/settings.json` alongside API keys. The server SHALL reject a save when the path is not absolute or does not exist as a directory. Clearing the field SHALL disable the Skills tool (which then links back to Settings).

#### Scenario: Setting the skills directory
- **WHEN** the user saves `/Users/cference/Code/claude-toolkit/skills` as the skills directory
- **THEN** `settings.json` contains the path and `/skills` lists that directory's skills without an app restart

#### Scenario: Nonexistent path rejected
- **WHEN** the user saves `/no/such/dir` as the skills directory
- **THEN** the API responds 400 naming the problem and the previous value is retained
