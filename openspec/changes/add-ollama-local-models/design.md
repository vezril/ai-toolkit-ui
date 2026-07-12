## Context

Grounded in the real machine: Ollama is installed and serving two models at `http://localhost:11434` (`/api/tags` returns them); promptfoo 0.121.17 speaks `ollama:chat:<model>` natively with the base URL from `OLLAMA_BASE_URL`. The eval builder already has two model-group precedents — CLI runners (exec) and API providers (hosted, key-gated, v0.3.0). Local models are a third group with a different gate (reachability, not key) and a different catalog source (dynamic `/api/tags`, not a fixed list).

## Goals / Non-Goals

**Goals:** eval prompts against locally-served Ollama models for free; dynamic model discovery; graceful absence when Ollama is down; round-trip like other providers.

**Non-Goals:** HuggingFace hub browse / `ollama pull` (follow-up); generic OpenAI-compatible endpoints (v1 is Ollama-only); relaxed guardrails for free runs (recorded); the app serving or downloading models (Ollama's job).

## Decisions

1. **Third model kind `'ollama'`** in `ModelDraft` (beside `'cli'`/`'api'`), not a fourth API-catalog entry — the gate and catalog source differ. Serialize enabled entries to `ollama:chat:<model>` (model names preserved verbatim, incl. `/` and `:`); parse back via an `^ollama:chat:(.+)$` match added beside the existing API-provider prefix parser.
2. **Dynamic catalog via `lib/ollama.ts`**: `probeOllama()` → `{ reachable, models: string[], baseUrl }` from a short-timeout `fetch(baseUrl + '/api/tags')`. `GET /api/evals` includes it as `ollama` so the builder renders live cards. Failure (down, timeout, non-JSON) resolves to `{ reachable: false, models: [] }` — never throws.
3. **Base URL in the settings store** (`ollamaBaseUrl`, default `http://localhost:11434`); the Settings card shows the probe result. Only a non-default value is injected into runs as `OLLAMA_BASE_URL` via the existing `settingsEnv()` merge in `lib/runs.ts` (default needs no injection since promptfoo already defaults to it).
4. **Boundary stance**: `/api/tags` is a localhost metadata GET — no inference, no key, no cost — so it does not cross the app's no-direct-model-**inference** line; inference stays in the promptfoo child. It is, however, the app's first outbound HTTP from server code; scoped to localhost + a user-set base URL, short timeout, read-only. Noted here rather than as an ADR (external browse or a paid call would earn one).
5. **Guardrails stay uniform**: local runs go through the same concurrency cap + timeout — a 35b model can hang or thrash memory, so the protections still earn their keep. UI marks local models "free (local)" so the cost distinction is visible without changing behavior.
6. **Validation**: enabling a local model whose name isn't in the current probe list is allowed (the user may know it's pullable) but warns; an Ollama judge with no reachable Ollama warns, mirroring the API-key gating stance but softer (reachability can change moment to moment).

## Risks / Trade-offs

- [Ollama slow to first token on a cold 35b load] → the run timeout (v0.8.0) already covers hangs; the builder's probe uses a short timeout separate from run time.
- [Model name characters breaking the provider ID] → `ollama:chat:` + verbatim name is promptfoo's own convention; round-trip parser is greedy after the prefix. Verified against the real `tripolskypetr/…:35b` name.
- [Probe latency on every builder load] → short timeout, and failure is cheap; result not cached in v1 (one small localhost call).

## Migration Plan

Single PR, **v0.14.0** (minor, additive). Absent Ollama = the calm not-detected state; nothing else changes. Rollback = revert.

## Open Questions
- None for v1 — HF browse and OpenAI-compatible generalization are explicit follow-ups.
