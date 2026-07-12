## MODIFIED Requirements

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
