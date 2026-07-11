# direct-api-providers

## Purpose
Key-gated direct API model providers (Anthropic/OpenAI/Google) in the eval builder and judge picker, with keys injected into runs as environment variables only.

## Requirements

### Requirement: Builder offers direct API providers alongside CLI runners
The eval builder's model grid SHALL present two groups: **CLI runners** (the existing 5 exec-script wrappers) and **API providers** (direct promptfoo providers for Anthropic, OpenAI, and Google, e.g. `anthropic:claude-sonnet-5`, `openai:gpt-5.2`, `google:gemini-3.5-pro`). API provider cards SHALL support the same controls as CLI cards (on/off toggle, model selection with suggestions, optional max-tokens) and SHALL also be offered in the judge picker.

#### Scenario: API provider serialized to config
- **WHEN** the user enables the Anthropic API provider with model `claude-sonnet-5` and saves
- **THEN** the generated YAML's `providers` list contains a promptfoo-native provider id (`anthropic:claude-sonnet-5`) with any max-tokens under its config, and no `exec:` wrapper

#### Scenario: API provider round-trips in the builder
- **WHEN** a generated config containing `anthropic:claude-sonnet-5` is opened via "Edit in builder"
- **THEN** the Anthropic API card is shown enabled with model `claude-sonnet-5` and other API cards shown off

### Requirement: API providers are gated on a configured key
An API provider card SHALL be enable-able only when a key for its provider exists in app settings. Cards without a configured key SHALL render disabled with a link to Settings. Attempting to save a draft that enables a keyless API provider SHALL fail validation server-side.

#### Scenario: Keyless provider gated in UI
- **WHEN** no Google key is configured and the user views the builder
- **THEN** the Google API card's toggle is disabled and the card links to `/settings`

#### Scenario: Keyless provider rejected server-side
- **WHEN** a draft enabling `openai:gpt-5.2` is POSTed while no OpenAI key is stored
- **THEN** the API responds 400 with a message naming the missing key

### Requirement: Configured keys are injected into spawned runs
When a run starts, the app SHALL inject each configured API key as its provider's conventional environment variable (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`) into the spawned `promptfoo eval` child process environment. Keys SHALL NOT be passed via CLI arguments, written to disk for the run, or echoed to the run log.

#### Scenario: Key available to promptfoo at run time
- **WHEN** an Anthropic key is configured and a run of a config using `anthropic:claude-sonnet-5` starts
- **THEN** the child process environment contains `ANTHROPIC_API_KEY` and the eval's Anthropic tests execute rather than erroring on missing credentials

#### Scenario: Key absent from observable run artifacts
- **WHEN** any run completes
- **THEN** the run log, `meta.json`, and results JSON contain no configured key material
