## Why

Calvin's toolkit now contains real Claude Code Workflow-tool scripts (`workflows/*.js` — three today, composing each other), but they're invisible except as code: no way to see a workflow's shape at a glance, no way to assemble a new one without hand-writing the JS, and the toolkit↔`~/.claude/workflows` copies drift silently. A visual workflow surface — view the shape of what exists, build new ones by wiring steps to existing skills — extends the app's form-over-artifact thesis to its third artifact type.

## What Changes

- **Workflows tool** in the sidebar (`/workflows`): lists every workflow in a configurable workflows directory — name, description, `whenToUse`, phase count, generated badge, and a **sync-status badge** against `~/.claude/workflows` (in sync / differs / missing) with a one-click copy.
- **Visual canvas** (`/workflows/edit`), hand-rolled SVG, two modes per the bounded-fidelity house contract (ADR-0004 precedent):
  - **View mode** (hand-written scripts): renders the author-declared `meta.phases` as a node chain, plus dashed **composition edges** where the body calls `workflow('other-name')` — the existing `new-scala-pekko-service ⇢ new-github-project` edge draws on day one. Structure is never edited; the raw file stays hand territory.
  - **Build mode** (marker-stamped generated workflows): full round-trip — add/remove/reorder sequential step nodes; click a node to edit its title, instructions, and optionally **wire in a skill** from the configured skills directory (searchable picker). Skill wiring is mechanical text embedding: the step's generated prompt references the skill by name with its description.
- **Compile target — a real Workflow-tool script**: generated `meta` (name/description/whenToUse/phases from the nodes) + a sequential body of `phase()` / `agent()` calls, each step's prompt receiving the previous step's result as context. The declarative step model is embedded in the file (`export const builderModel`) for exact round-trips. Immediately runnable from any Claude Code session; **the UI never executes workflows** (agent fleets cost money — running stays in Claude Code).
- **Dual-location management** (decided): saves write the workflows directory AND `~/.claude/workflows` (copies, matching the existing convention).
- **Settings gains a "Workflows directory"** path (third sandboxed root, same pattern as skills).

## Capabilities

### New Capabilities
- `workflow-builder`: listing + sync status, the two-mode canvas, the step model and its compile/round-trip contract, dual-location writes.

### Modified Capabilities
- `app-settings`: ADDED requirement — workflows directory setting.
- `sidebar-navigation`: MODIFIED — tool list gains Workflows.

## Impact

- **Server:** new `lib/workflows.ts` (third sandbox root; meta extraction; composition-edge detection; step model ⇄ script codegen; dual-location write + sync status); new `app/api/workflows/route.ts`.
- **UI:** `/workflows` list + `/workflows/edit` SVG canvas; NavLinks entry; Settings card.
- **Follow-up documented, not built:** parallel fan-out steps (`parallel()` branches) — sequential-only v1 by decision.
- **Docs:** PRD §11 delta row; CHANGELOG under **v0.11.0**. **Dependencies:** none; zero model calls.
