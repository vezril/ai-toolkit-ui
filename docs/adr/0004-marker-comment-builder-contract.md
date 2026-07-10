# ADR-0004: Marker-comment contract for builder round-tripping, with bounded fidelity

**Status:** Accepted (retroactive)

## Context

The builder needs to know which configs it's safe to parse back into form state ("Edit in builder") without risk of silently mangling a hand-written config whose structure it doesn't fully understand — promptfoo's YAML schema is far richer (assertion types, provider options, `defaultTest` structures) than the builder's form model covers (only `contains`/`icontains`/`llm-rubric` checks, a fixed 5-runner catalog).

## Decision

A config is considered "builder-generated" if and only if its YAML file's raw text starts with the literal string `# ai-toolkit-ui: eval-builder v1` (`GENERATED_MARKER` in `lib/evals.ts`). Only configs with this marker are offered "Edit in builder" (FR-5, FR-9, FR-14); `filesToDraft` refuses to parse any config lacking it. On save, the builder always re-writes the full marker header plus a hand-edit warning comment, and only round-trips the fields it itself models — `contains`/`icontains`/`llm-rubric` assertions, the fixed runner catalog, and its own draft shape. Any other assertion type or YAML structure present in a generated config (e.g., added by hand after generation) is silently dropped the next time that config is saved through the builder (NFR-5).

## Consequences

- The marker is a simple, greppable, zero-infrastructure way to distinguish "safe to round-trip" from "hands off" configs — no separate registry/database of which configs are builder-owned is needed (FR-9's consequence: presence/absence of the Edit-in-builder link is derived purely from this one string check).
- The cost is an explicit, documented, and intentionally *unfixed* data-loss boundary: hand-editing a generated config to add an assertion type the builder doesn't model, then re-saving through the builder, silently deletes that addition. This is the single most consequential trade-off in the builder's design and is called out by name in NFR-5 rather than hidden — "bounded fidelity," not "full fidelity."
- Non-generated (hand-written) configs can never be edited via the builder, even if their structure happens to be builder-compatible (FR-5's consequence) — there's no "adopt this config into the builder" path (open question OQ-2 in the PRD), only "create new" or "hand-edit forever."
- The marker is trivially spoofable (any hand-written file starting with that exact comment line is treated as generated) — acceptable because the blast radius of a false-positive is "the builder overwrites this file's structure to fit its model on next save," which is a single local user's own mistake to make, not a security boundary.
