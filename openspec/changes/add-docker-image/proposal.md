## Why

Running the app today means cloning the repo and `npm run dev` on your own machine. Calvin wants it as a **self-contained, deployable service** — a container that clones `vezril/claude-toolkit` into itself and runs on a homelab server, not his laptop. This reframe is cleaner than host bind-mounts: the container owns a *pristine* clone (versioning commits and Ship-to-PR never tangle with a dirty host tree), needs no fragile mount matrix, and is genuinely deployable. Evals live in a persistent volume; the service is exposed on a trusted LAN with no app auth (perimeter is the network's responsibility — see the security note).

## What Changes

- **`output: 'standalone'`** in `next.config.ts` → a minimal self-contained server bundle.
- **Env-configured roots**: `getSkillsDir/getAgentsDir/getWorkflowsDir` and `getOllamaBaseUrl` resolve `stored setting ?? environment variable ?? default`, so the container is configured purely by env (`SKILLS_DIR`, `AGENTS_DIR`, `WORKFLOWS_DIR`, `OLLAMA_BASE_URL`; `PROJECT_ROOT` is already env-driven). Backward-compatible — host users with no env set are unaffected, and the Settings UI still overrides.
- **Multi-stage `Dockerfile`** (build → `node:22-alpine` runtime + `git` + pinned `promptfoo`, non-root, `HEALTHCHECK`, `EXPOSE 3210`) with an **entrypoint** that, on start: clones `TOOLKIT_REPO` into the data volume (or `git pull`s if present), configures git identity (and a token credential for Ship when `GITHUB_TOKEN` is set), ensures the empty evals project dir exists, and launches the server bound to `0.0.0.0`.
- **`docker-compose.yml`**: one named `/data` volume (holding the toolkit clone, the evals project, `~/.ai-toolkit-ui` settings, `~/.claude` — via `HOME=/data`), the env config above, `extra_hosts` host-gateway so a host/sidecar Ollama is reachable, and the published port.
- **`.github/workflows/release.yml`**: on a `vX.Y.Z` tag, buildx-build and push `vezril/ai-toolkit-ui:X.Y.Z` + `:latest`, degrading gracefully (build only, skip push) without `DOCKERHUB_*` secrets.
- **README "Run in Docker"**: quickstart, the env reference, a capability matrix (works in-container vs host-only), and a **prominent security warning** — LAN-exposed with no auth means anyone who reaches the port has full control, including the stored API keys and git-push token; run only on a trusted network.

## Capabilities

### New Capabilities
- `containerization`: the standalone build, env-configured roots, the self-cloning image + entrypoint, the persistent data volume, and the tagged Docker Hub publish.

### Modified Capabilities
- `local-model-providers`: MODIFIED — Ollama base URL now also honors `OLLAMA_BASE_URL` (host/sidecar reachability from the container).

## Impact

- **Build/runtime:** `next.config.ts` (`output: standalone`); `lib/settings.ts` env fallbacks for the three component roots + Ollama URL; new `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore`, `docker-compose.yml`.
- **CI:** new `.github/workflows/release.yml`.
- **Docs:** README Docker section + capability matrix + security warning; PRD §11 delta row and a note that this does **not** change the single-user, no-auth stance — it packages that stance into a container whose perimeter you own.
- **Your one-time action:** create the Docker Hub repo + set `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` GitHub secrets (`dockerhub-setup`, needs an admin PAT, never a password in chat). Until then CI builds and skips push. For Ship from the container, provide a `GITHUB_TOKEN` with repo scope.
- **Honest edges:** the CLI runner scripts (devin/claude/…) are host-installed/authed and do **not** run in-container — the containerized eval path is API providers + Ollama. Stated up front in the matrix.
- **Dependencies:** none added to the app; the image bundles git + promptfoo.
