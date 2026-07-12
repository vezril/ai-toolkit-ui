## Why

Every model the eval builder can reach today costs money per token (API providers) or wraps a paid CLI. Calvin runs Ollama locally with models already pulled — a free, offline model server on `localhost:11434` that promptfoo speaks natively (`ollama:chat:<model>`). Wiring it in lets him eval prompts against his own models for free, with no key and no cloud round-trip. It's the direct-API-providers pattern (v0.3.0) with a new, cheaper category.

## What Changes

- **"Local models" group in the eval builder** alongside CLI runners and API providers: one card per model Ollama is currently serving, with the same on/off toggle, model selection, and optional max-tokens. Local models are also offered in the judge picker.
- **Dynamic model discovery** (not a fixed catalog — unlike the API providers): the builder lists whatever `GET <ollamaBaseUrl>/api/tags` returns, so a freshly `ollama pull`ed model appears without a code change. Gating is by **reachability** (Ollama up + has models), not by a stored key.
- **Serialization**: enabled local models emit `ollama:chat:<model>` provider IDs (model names may contain `/` and `:`, e.g. `tripolskypetr/qwen3.5-uncensored-aggressive:35b`); max-tokens rides in the provider config. A non-default Ollama base URL is injected into spawned runs as `OLLAMA_BASE_URL` (reusing the settings-env pattern — never a CLI arg). Round-trips like the other provider kinds.
- **Settings gains an Ollama base URL** (default `http://localhost:11434`) with a "detected N models" confirmation. When Ollama is unreachable, the builder's Local models group shows a calm "not detected at <url>" state — never an error.
- **Free-to-run signalling**: local model cards and the run-cost notes mark these as free/local. (Guardrails stay uniform in v1 — a 35b model can still hang or thrash the machine; the relaxed-guardrail idea is recorded as a follow-up.)

## Capabilities

### New Capabilities
- `local-model-providers`: Ollama discovery, the Local models builder group + judge option, `ollama:chat` serialization/round-trip, and run-time base-URL injection.

### Modified Capabilities
- `app-settings`: ADDED — Ollama base URL setting with reachability/model-count feedback.

## Impact

- **Server:** new `lib/ollama.ts` (reachability probe + `/api/tags` model list against the configured base URL); `lib/evals.ts` gains an `'ollama'` model kind (serialize/parse/validate); `lib/runs.ts` injects `OLLAMA_BASE_URL` when non-default; `lib/settings.ts` + Settings card; `GET /api/evals` returns `ollamaModels` + reachability.
- **UI:** builder Local models group; Settings Ollama card.
- **Boundary note (design):** listing models is a **localhost metadata GET** — not inference, no key, no cost — so it does not breach the app's no-direct-model-**inference** boundary; inference still happens inside the promptfoo child. This is the app's first localhost capability probe, noted but not ADR-worthy (unlike external browse or git execution).
- **Docs:** PRD §11 delta row; CHANGELOG under **v0.14.0**. **Dependencies:** none.

## Non-goals / follow-ups (documented)

- HuggingFace hub browse and `ollama pull hf.co/…` import — separable discovery feature.
- Generic OpenAI-compatible endpoints (LM Studio / llama.cpp / vLLM) — one base-URL field could generalize later; v1 is Ollama-only since that's what's running.
- Relaxed run guardrails for free local models — recorded, not built.
