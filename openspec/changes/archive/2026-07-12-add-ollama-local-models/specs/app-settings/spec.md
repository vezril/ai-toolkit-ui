## ADDED Requirements

### Requirement: Ollama base URL setting
The Settings page SHALL provide an Ollama base URL field defaulting to `http://localhost:11434`, persisted in `~/.ai-toolkit-ui/settings.json`, with feedback showing whether Ollama is reachable there and how many models it is serving. An empty value SHALL reset to the default.

#### Scenario: Reachability feedback
- **WHEN** the user opens Settings and Ollama is serving two models at the default URL
- **THEN** the Ollama field shows the default URL and a "reachable — 2 models" confirmation
