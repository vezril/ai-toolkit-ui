## ADDED Requirements

### Requirement: Env-configured component and Ollama roots
The resolution of the skills, agents, and workflows directories, and the Ollama base URL, SHALL follow `stored setting ?? environment variable ?? default`: `SKILLS_DIR`/`AGENTS_DIR`/`WORKFLOWS_DIR` (default unset → tool disabled) and `OLLAMA_BASE_URL` (default `http://localhost:11434`). `PROJECT_ROOT` remains env-driven. Host behavior with no env set SHALL be unchanged, and a value saved in Settings SHALL still take precedence.

#### Scenario: Container configured purely by env
- **WHEN** the container runs with `SKILLS_DIR=/data/claude-toolkit/skills` and no stored setting
- **THEN** the Skills tool lists that directory's skills with no manual Settings step

#### Scenario: Stored setting still wins
- **WHEN** an env root is set but the user saves a different path in Settings
- **THEN** the saved path is used

### Requirement: Self-contained self-cloning image
The image SHALL build from a multi-stage Dockerfile (build → slim non-root `node:22-alpine` runtime bundling `git` and a pinned `promptfoo`, `HEALTHCHECK`, `EXPOSE 3210`) and run an entrypoint that, on start: clones `TOOLKIT_REPO` into the data volume if absent (else `git pull`, best-effort), configures git identity from env (and a `GITHUB_TOKEN`-based push credential when provided), ensures the evals project directory exists, and serves bound to `0.0.0.0`.

#### Scenario: First boot clones the toolkit and serves
- **WHEN** the container starts fresh with an empty data volume and network access
- **THEN** `TOOLKIT_REPO` is cloned into the volume, the Skills/Agents/Workflows tools list its contents, and `GET /` returns the app shell

#### Scenario: Restart reuses and refreshes the clone
- **WHEN** the container restarts with a populated data volume
- **THEN** the existing clone is reused (pulled, not re-cloned) and prior settings/evals persist

#### Scenario: Bundled tools present offline
- **WHEN** `git --version` and `npx promptfoo --version` run inside the image
- **THEN** both resolve without a network fetch

### Requirement: Persistent data volume
All mutable state — the toolkit clone, the evals project (configs, generated evals, run history), `~/.ai-toolkit-ui` settings, and the `~/.claude` deploy twins — SHALL live under a single `/data` path (via `HOME=/data`) backed by a named volume, surviving container recreation.

#### Scenario: State survives recreation
- **WHEN** the container is destroyed and recreated against the same volume
- **THEN** stored API keys, built evals, and toolkit version history are still present

### Requirement: Tagged Docker Hub publish, degrading without secrets
A release workflow SHALL, on a `vX.Y.Z` tag, buildx-build the image and push `vezril/ai-toolkit-ui:X.Y.Z` and `:latest`. Without `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` secrets it SHALL still build and skip the push rather than fail.

#### Scenario: Push on tag with secrets
- **WHEN** a `vX.Y.Z` tag is pushed and Docker Hub secrets are configured
- **THEN** immutable `:X.Y.Z` and moving `:latest` tags are published

#### Scenario: Graceful skip without secrets
- **WHEN** the workflow runs without Docker Hub secrets
- **THEN** the build succeeds and the push step is skipped, not errored

### Requirement: No-auth service posture is documented
Because the service runs without authentication and is intended for a trusted network, the README SHALL carry a prominent warning that any client reaching the port has full control — including stored API keys and the git-push token — and SHALL advise trusted-network-only deployment.

#### Scenario: Warning present
- **WHEN** a reader opens the README Docker section
- **THEN** the no-auth / trusted-network warning is stated before the run instructions
