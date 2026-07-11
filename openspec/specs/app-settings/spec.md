# app-settings

## Requirements

### Requirement: Settings page for system configuration
The app SHALL provide a Settings page at `/settings`, reachable from the sidebar's pinned Settings entry, presenting system configuration sections; the first section SHALL be provider API keys.

#### Scenario: Reaching settings
- **WHEN** the user clicks the Settings entry in the sidebar
- **THEN** the `/settings` page renders with an API-keys section listing every supported API provider (Anthropic, OpenAI, Google)

### Requirement: API keys are stored in an app-level config file outside any git repository
API keys SHALL be persisted to `~/.ai-toolkit-ui/settings.json` with file permissions `0600` (owner read/write only). Keys MUST NOT be written anywhere under `REPO_ROOT` (the target project) or the app's own repository, and MUST NOT appear in generated eval YAML, run logs, or `eval-runs/` artifacts.

#### Scenario: Key persisted to app config
- **WHEN** the user saves an Anthropic API key in Settings
- **THEN** `~/.ai-toolkit-ui/settings.json` contains the key, its permission bits are `0600`, and no file under `REPO_ROOT` changed

#### Scenario: Keys never enter generated YAML
- **WHEN** an eval using a direct API provider is saved via the builder
- **THEN** the generated config YAML references the provider by id only and contains no key material

### Requirement: Keys are masked after save
GET responses from the settings API SHALL never include full key material: each stored key SHALL be represented by its provider id, a masked preview (at most the last 4 characters), and a set-timestamp. Full keys SHALL only travel client→server on save.

#### Scenario: Masked read-back
- **WHEN** the Settings page loads and a key `sk-ant-abc…wxyz` is stored
- **THEN** the API response and UI show only a masked form ending in `wxyz`, never the full key

### Requirement: Keys can be added, replaced, and removed
The Settings page SHALL allow adding a key for a supported provider, replacing an existing key, and removing a key; each mutation SHALL take effect for subsequently started runs without an app restart.

#### Scenario: Remove a key
- **WHEN** the user removes the OpenAI key and confirms
- **THEN** the key is deleted from `settings.json`, the UI shows OpenAI as unconfigured, and API provider entries gated on that key become disabled in the builder

### Requirement: Configurable skills directory
The Settings page SHALL provide a "Skills directory" field accepting an absolute path to the directory where Agent Skills live (e.g. `/Users/cference/Code/claude-toolkit/skills`), persisted in `~/.ai-toolkit-ui/settings.json` alongside API keys. The server SHALL reject a save when the path is not absolute or does not exist as a directory. Clearing the field SHALL disable the Skills tool (which then links back to Settings).

#### Scenario: Setting the skills directory
- **WHEN** the user saves `/Users/cference/Code/claude-toolkit/skills` as the skills directory
- **THEN** `settings.json` contains the path and `/skills` lists that directory's skills without an app restart

#### Scenario: Nonexistent path rejected
- **WHEN** the user saves `/no/such/dir` as the skills directory
- **THEN** the API responds 400 naming the problem and the previous value is retained
