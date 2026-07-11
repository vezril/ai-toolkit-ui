# workflow-builder

## Requirements

### Requirement: Workflows are listed with sync status
The app SHALL provide a Workflows page at `/workflows` listing every `*.js` workflow in the configured workflows directory whose `export const meta` block is extractable — showing name, description, `whenToUse`, phase count, a generated badge for marker-stamped files, and a sync-status badge comparing content against the same filename in `~/.claude/workflows` (in sync / differs / missing there), with a one-click action copying the workflows-directory version into `~/.claude/workflows`. When no workflows directory is configured, the page SHALL link to Settings instead. Files whose meta cannot be extracted SHALL be listed by filename with an "unreadable meta" note, never an error page.

#### Scenario: Listing with drift
- **WHEN** `new-python-project.js` differs between the workflows directory and `~/.claude/workflows`
- **THEN** its card shows a differs badge and the sync action makes the two byte-identical

### Requirement: Hand-written workflows visualize as declared phases with composition edges
Opening a non-generated workflow SHALL render a read-only canvas: one node per `meta.phases` entry (title + detail) in declared order, and a dashed composition edge to every workflow named in a `workflow('name')` / `workflow("name")` call in the body. The canvas SHALL offer no structural editing for such files.

#### Scenario: Composition edge drawn
- **WHEN** the canvas opens `new-scala-pekko-service` (whose body calls `workflow('new-github-project', …)`)
- **THEN** its phase chain renders with a dashed edge to a `new-github-project` node, and no add/remove/reorder controls appear

### Requirement: Generated workflows build visually and round-trip exactly
Marker-stamped workflows SHALL open in build mode: sequential step nodes (add, remove, reorder), each editable in a side panel — title, instructions, and an optional wired skill chosen from the configured skills directory. Saving SHALL regenerate the script: `meta` derived from the canvas (phases mirror the steps), a body of sequential `phase()`/`agent()` calls where each step's prompt contains its instructions, the wired skill's name and description when present, and the previous step's result as context; the declarative step model SHALL be embedded in the file such that reopening the canvas restores it exactly.

#### Scenario: Step wiring a skill
- **WHEN** a step titled "Write the PRD" wires the `requirements-engineering` skill and the workflow is saved
- **THEN** the generated script's corresponding `agent()` prompt contains the step instructions, the skill's name, and its description, and `meta.phases` contains a "Write the PRD" entry

#### Scenario: Exact round-trip
- **WHEN** a generated workflow with three steps is reopened in the canvas
- **THEN** all three steps' titles, instructions, and skill wirings appear exactly as last saved

#### Scenario: Generated script is a valid Workflow-tool script
- **WHEN** a workflow is saved from the canvas
- **THEN** the file begins with the builder marker, exports a `meta` literal with name/description/phases, and its body parses as valid JavaScript

### Requirement: Saves write both managed locations
Saving a generated workflow SHALL write the script to the configured workflows directory and copy it to `~/.claude/workflows` (creating the directory if needed), so new workflows are immediately invokable by Claude Code sessions.

#### Scenario: Dual write
- **WHEN** a new workflow `triage-bugs` is saved from the canvas
- **THEN** byte-identical `triage-bugs.js` files exist in the workflows directory and `~/.claude/workflows`
