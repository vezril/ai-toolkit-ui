## Context

Reframed mid-proposal (2026-07-12): not a host control panel with bind-mounts, but a **self-contained service** that clones `vezril/claude-toolkit` into itself and runs on a homelab server. Decisions taken: evals in a persistent volume (not a git repo); exposed on a trusted LAN with no app auth. Ground truth: Docker 28 daemon is live (real build verifiable); `PROJECT_ROOT` already env-driven; the runtime shells out to `npx promptfoo`, `node ../<cli>`, `git`.

## Goals / Non-Goals

**Goals:** a small reproducible published image that is self-configuring from env, self-cloning the toolkit, persistent across restarts, and honest about its edges and its security posture.

**Non-Goals:** app-level authentication (explicitly deferred — perimeter is the network's job per the decision); bundling the proprietary CLI runners (host-only by necessity); multi-tenant hosting (still single-user, just containerized).

## Decisions

1. **Env-configured roots over a seeded settings.json.** Extending the `OLLAMA_BASE_URL` pattern to `SKILLS_DIR`/`AGENTS_DIR`/`WORKFLOWS_DIR` (`stored ?? env ?? default`) makes the container fully configured by environment — Docker-idiomatic, no first-run JSON seeding, and the Settings UI still overrides. `PROJECT_ROOT` already works this way.
2. **Single `/data` volume via `HOME=/data`.** The app writes settings to `os.homedir()/.ai-toolkit-ui` and deploy twins to `~/.claude`; pointing `HOME` at the volume captures those plus the toolkit clone and the evals project in one persistent place. Simple ownership story for the non-root user.
3. **Self-cloning entrypoint, not a baked-in toolkit.** Cloning at *start* (into the volume) keeps the toolkit fresh and decoupled from image rebuilds; a populated volume is pulled, not re-cloned. The clean clone also fixes the dirty-host-tree problem that made versioning awkward — commits and Ship-to-PR run against pristine state.
4. **Git push needs a token; clone does not.** `vezril/claude-toolkit` is public (anonymous clone); Ship/push needs `GITHUB_TOKEN` (repo scope) wired as a credential in the entrypoint. Absent token = read-only toolkit (author/version locally, Ship disabled) — a fine degraded mode.
5. **Ollama via env, host or sidecar.** `OLLAMA_BASE_URL` defaults to `host.docker.internal:11434` (server's host Ollama) but points anywhere — a sidecar container, a remote box. `extra_hosts` maps the gateway on Linux; a no-op on Desktop.
6. **CI builds always, pushes conditionally.** `release.yml` on `v*`: buildx build unguarded (Dockerfile CI-verified from day one), login+push guarded on `secrets.DOCKERHUB_USERNAME != ''`. Matches the user's graceful-degradation convention; Docker Hub repo+secrets are the one-time `dockerhub-setup`.
7. **Security stated, not solved.** The user accepted a no-auth LAN service. The responsible move is a blunt README warning (full control incl. keys + push token to anyone on the port) and a recommendation to keep it on a trusted network — plus keeping app-auth as a named separate change if the posture ever tightens.

## Risks / Trade-offs

- [No-auth service reachable on the LAN] → documented forcefully; mitigation is network perimeter (the user's choice). App-auth remains a separate future change.
- [`GITHUB_TOKEN` and API keys sit in the volume] → same trust model as the host today (`~/.ai-toolkit-ui` 0600), now on a server the user controls; the LAN-exposure warning covers the delta.
- [CLI-runner evals can't run in-container] → capability matrix sets expectations; API + Ollama is the container's eval path.
- [Bundled promptfoo drift vs. host] → pinned in the Dockerfile, bumped with releases; reproducibility is the point.
- [Clone at start needs network] → first boot requires it; offline restart reuses the volume clone.

## Migration Plan

Single PR, **v0.15.0** (minor, additive). Host behavior unchanged (env fallbacks inert when unset). Rollback = revert; image artifacts are inert files. Docker Hub publishing activates after `dockerhub-setup`.

## Open Questions

- Publish a `:dev` image on `main` pushes too? Leaning tag-only for v1; trivial follow-up.
