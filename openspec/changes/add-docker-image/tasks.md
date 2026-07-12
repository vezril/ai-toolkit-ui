## 1. Standalone build + env-configured roots

- [x] 1.1 `next.config.ts`: add `output: 'standalone'`
- [x] 1.2 `lib/settings.ts`: `getSkillsDir/getAgentsDir/getWorkflowsDir` → `stored ?? process.env.{SKILLS,AGENTS,WORKFLOWS}_DIR ?? null`; `getOllamaBaseUrl` → `stored ?? process.env.OLLAMA_BASE_URL ?? default`
- [x] 1.3 Verify by API (host, env set): `SKILLS_DIR=… npm run dev`-style — a stored setting still wins, env used when unset (unit-style check via a temporary env)

## 2. Image + entrypoint

- [x] 2.1 `Dockerfile` (multi-stage: build → `node:22-alpine` + git + pinned promptfoo, non-root, HEALTHCHECK, EXPOSE 3210) + `.dockerignore`
- [x] 2.2 `docker-entrypoint.sh`: clone `TOOLKIT_REPO` into `/data/claude-toolkit` if absent else pull; git identity + optional `GITHUB_TOKEN` push credential; `mkdir -p` the evals dir; `exec` the standalone server on `0.0.0.0:3210`
- [x] 2.3 Verify with the real Docker daemon: `docker build` succeeds; run with a `/data` volume + env → entrypoint clones the toolkit, `GET /` is 200, the Skills/Agents/Workflows APIs list the cloned repo's contents; restart reuses the volume; `git`/`npx promptfoo` resolve inside; remove the test image/volume after

## 3. Compose + CI

- [x] 3.1 `docker-compose.yml`: single `/data` volume, `HOME=/data`, the root + `OLLAMA_BASE_URL` + `TOOLKIT_REPO` + `GITHUB_TOKEN` + git-identity env, `extra_hosts` host-gateway, published port; `docker compose config` validates
- [x] 3.2 `.github/workflows/release.yml`: buildx build on `v*` always; login+push `:X.Y.Z`+`:latest` guarded on the Docker Hub secret; read-through/lint confirms the guard

## 4. Docs, versioning, release

- [x] 4.1 README "Run in Docker" (quickstart, env reference, capability matrix, **prominent no-auth/trusted-network warning**); PRD §11 delta row + stance note; CHANGELOG under 0.15.0; document the one-time `dockerhub-setup`
- [ ] 4.2 Full verify pass over spec scenarios, feature-branch PR, human gate, merge, tag v0.15.0, archive (materialize `containerization`, sync the `local-model-providers` delta)
