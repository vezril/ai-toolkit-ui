# local-model-providers Specification

## Purpose
TBD - created by archiving change add-ollama-local-models. Update Purpose after archive.
## Requirements
### Requirement: Ollama models are discovered dynamically
The system SHALL query `GET <ollamaBaseUrl>/api/tags` and offer each returned model as a selectable local-model provider in the eval builder, where `<ollamaBaseUrl>` resolves from the stored setting, else the `OLLAMA_BASE_URL` environment variable, else `http://localhost:11434`. Discovery SHALL be by reachability: when Ollama is unreachable or serving no models, the builder's Local models group SHALL render a calm "not detected" state naming the base URL, never an error, and the rest of the builder SHALL be unaffected.

#### Scenario: Pulled models appear
- **WHEN** Ollama is serving a model and the builder loads
- **THEN** the Local models group shows a card for that model, enable-able like any provider

#### Scenario: Env base URL used in a container
- **WHEN** the app runs with `OLLAMA_BASE_URL=http://host.docker.internal:11434` and no stored setting
- **THEN** discovery queries that URL rather than `localhost`

#### Scenario: Ollama down degrades calmly
- **WHEN** Ollama is not reachable at the resolved base URL
- **THEN** the Local models group shows a "not detected at <url>" note and no local cards, and other model groups still work

### Requirement: Local models serialize to native Ollama providers
An enabled local model SHALL serialize to an `ollama:chat:<model>` provider ID (preserving `/` and `:` in model names) with any max-tokens under its config, and SHALL be offered in the judge picker. The builder round-trip SHALL restore enabled local models from `ollama:chat:*` provider IDs.

#### Scenario: Ollama provider in config
- **WHEN** the user enables the `tripolskypetr/qwen3.5-uncensored-aggressive:35b` local model and saves
- **THEN** the config's providers list contains `ollama:chat:tripolskypetr/qwen3.5-uncensored-aggressive:35b`, no key material, no exec wrapper

#### Scenario: Round-trip
- **WHEN** a generated config containing an `ollama:chat:*` provider is reopened in the builder
- **THEN** that local model card is shown enabled with the correct model and others off

### Requirement: Non-default base URL reaches spawned runs as an env var
When the configured Ollama base URL differs from the default, it SHALL be injected into the spawned `promptfoo eval` process environment as `OLLAMA_BASE_URL`, never as a CLI argument. The default base URL SHALL require no injection.

#### Scenario: Custom base URL honored at run time
- **WHEN** the base URL is set to a non-default value and a run using an Ollama provider starts
- **THEN** the child process environment contains `OLLAMA_BASE_URL` set to that value

