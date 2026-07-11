## Context

Agents are the toolkit's simplest component: flat `agents/*.md` files with YAML frontmatter (`name`, `description`, `tools`, occasionally more) and a markdown body — 35 real files today. `~/.claude/agents` currently holds symlinks (deploy = always current), but copies are possible futures, so deploy detection must distinguish both. Everything here mirrors the skills tool (v0.4.0) with two simplifications: no subdirectories (flat files) and no supporting-file inventory.

## Goals / Non-Goals

**Goals:** first-class list/edit/validate surface for agents, deploy-status visibility, full-fidelity round-trips — landing before `add-toolkit-versioning` so versioning covers all three component types at birth.

**Non-Goals:** running/testing agents; frontmatter fields beyond name/description/tools/model as form fields (others round-trip untouched); quick-fixes (versioning's restore supersedes the need); the `agent-eval` bridge analog (future idea, not this change); managing the `~/.claude/agents` side (symlinks are the user's convention; no sync action in v1 — deploy badge only).

## Decisions

1. **`lib/agents.ts` mirrors `lib/skills.ts` structurally** but stays a separate module with its own root (fifth sandboxed... fourth configured root): flat-file resolution (`<name>.md`), same parse-merge-serialize frontmatter handling, same validation tiering. Shared code is limited to conventions, not abstractions — three small explicit modules beat one parameterized one (same call as ADR-0010).
2. **Deploy detection**: `fs.lstatSync` on `~/.claude/agents/<name>.md` — symlink (resolving into the agents dir) → "symlinked"; regular file → hash-compare → in-sync/differs; absent → not deployed. Read-only in v1.
3. **Known-tool catalog** for the warning heuristic: a static string list of common tool names (Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Task, `*`); comma/space-split the `tools` value. Unknown entries warn, never block (custom/MCP tools exist).
4. **Description coaching reused** from the skills editor (same band, same live counter) — agents' descriptions drive delegation routing exactly like skills' drive triggering.

## Risks / Trade-offs

- [Frontmatter block scalars (`description: >`)] → the YAML library handles them; round-trip re-serialization may normalize folding style (semantically lossless, same accepted trade as skills).
- [Tools catalog drift] → warning-only; false warnings are one-line advisory noise.

## Migration Plan

Single PR, **v0.12.0**. Purely additive. Rollback = revert.

## Open Questions
- None.
