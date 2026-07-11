## Context

Explored (2026-07-11) against real artifacts: three hand-written Claude Code Workflow-tool scripts in `claude-toolkit/workflows/` (rich `meta` with `phases[]`; bodies spawning agents and composing each other via `workflow('name')`), duplicated as plain copies in `~/.claude/workflows`. Decisions from the session: compile target is my call (settled below), sequential-only v1 with parallel fan-out documented as follow-up, and the builder manages both file locations. House precedents: bounded-fidelity generated artifacts (ADR-0004), sandboxed roots per external directory (ADR-0010), mechanical skill-text embedding (v0.5.0), hand-rolled SVG-free UI patterns.

## Goals / Non-Goals

**Goals:**
- See any workflow's shape (phases + composition) at a glance; build new sequential workflows by wiring steps to existing skills; ship them as genuinely runnable Workflow-tool scripts in both managed locations.

**Non-Goals:**
- **Executing workflows from the UI** — runs spawn agent fleets and cost money; running stays in Claude Code sessions.
- **Parallel fan-out steps** (`parallel()` branches, per-item pipelines) — documented follow-up; the step model reserves room (a step is an object, not a string) but v1 renders and generates strictly sequential chains.
- Structural editing of hand-written scripts; AST-level analysis of bodies (regex-level composition detection only); deleting workflows; free-form node dragging (auto-layout only in v1).
- AI-assisted step drafting (boundary intact, sixth time).

## Decisions

1. **Compile to a Workflow-tool script** (delegated decision): each step becomes `phase(title)` + `await agent(prompt)`, prompts built from the step's instructions, the wired skill's name + description ("Load and apply the <name> skill — <description>."), and the previous step's result appended as context (`results[i-1]`). The generated script returns the final step's result. This keeps builder output first-class: runnable, composable by future hand-written workflows, listed by `/workflows` in Claude Code. Alternative (compile to a stepped SKILL.md) rejected — it wouldn't be a workflow, just prose.
2. **Exact round-trip via an embedded model, not JS parsing** — generated files carry `export const builderModel = {…}` (the declarative step model as a literal) alongside the marker comment. The canvas reads `builderModel`; codegen writes both it and the executable body from the same model. Hand edits to the body of a *generated* file are overwritten on next save — same bounded-fidelity contract as ADR-0004, stated in the file header.
3. **Meta extraction via balanced-brace slice + `new Function('return …')`** — meta blocks are JS object literals (not JSON); evaluating just the sliced literal with the Function constructor is acceptable under the local trust model (A2: the user's own files, same trust as executing these workflows at all). The body is never evaluated. Extraction failure degrades to an "unreadable meta" listing, never an error.
4. **Composition edges by regex** (`workflow\(\s*['"]([\w-]+)['"]`) — cheap, matches the three real scripts, false negatives acceptable (edges are informative, not load-bearing).
5. **Canvas is hand-rolled SVG with auto-layout** — vertical chain, computed positions (no dragging, no position persistence), node click opens a side panel form. Keeps the 4-package footprint; drag/free-layout can come with the parallel follow-up if ever needed.
6. **Fourth write location, narrowly scoped** — `~/.claude/workflows/<name>.js` is written only by the save/sync paths with fixed basename composition (no client-supplied paths), alongside the sandboxed workflows root. Sync status = content hash comparison.
7. **Skill picker reuses `listSkills()`** through the existing skills sandbox; unconfigured skills dir degrades the picker to a free-text skill name (wiring is text embedding either way).

## Risks / Trade-offs

- [Function-constructor evaluation of meta] → sliced literal only, local-trust model, and the same user already *runs* these scripts; documented in the file and PRD delta.
- [Generated scripts drift from Workflow-tool API changes] → codegen emits only the stable core (`meta`, `phase`, `agent`, template literals); the generated-script-validity scenario is checked with `new Function` parse at save time.
- [Prompt-injection-ish content in step instructions breaking the generated template literal] → instructions are embedded via `JSON.stringify` (codegen never string-concatenates raw user text into code).
- [Dual-write partial failure (one location written, other errors)] → write toolkit root first, `~/.claude` second; on second-write failure surface the error with the sync badge showing the truth; the sync action retries.

## Migration Plan

Single PR, **v0.11.0** (minor). Existing hand-written workflows are untouched (view + sync only). Rollback = revert; generated scripts remain valid standalone files.

## Open Questions

- None — decisions settled in the design session (compile target delegated and settled above).
