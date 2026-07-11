## Why

The toolkit's third component type — 35 agent definitions in `agents/*.md` — has no surface in the app at all: skills and workflows can be browsed, health-checked, and edited, but agents are invisible. This change gives agents the same first-class treatment (list, editor, validation, deploy status), and deliberately lands *before* `add-toolkit-versioning` so the git-backed versioning machinery covers all three component types uniformly.

## What Changes

- **Agents tool** in the sidebar (`/agents`): lists every `*.md` in a configurable agents directory (excluding `README.md`) — name, description preview, declared tools, health badge, and a **deploy badge** against `~/.claude/agents` (symlinked · copy in sync · copy differs · not deployed).
- **Agent editor** (`/agents/edit`): frontmatter form (name locked to filename on edit; description textarea with the same trigger-phrase coaching and live length feedback as skills; `tools` field; optional `model`) + markdown body editor. Unknown frontmatter keys round-trip untouched (full-fidelity, the skills stance — these are hand-authored files the editor joins).
- **Structural validation**, errors block / warnings inform: name matches filename and kebab-case; description non-empty; body non-empty; warnings for description length band and unknown tool names (checked against a static catalog of tool identifiers).
- **`agentsDir` setting** (fourth configured root, same validation pattern), example `/Users/cference/Code/claude-toolkit/agents`.

## Capabilities

### New Capabilities
- `agents-tool`: listing + deploy status, the editor with full-fidelity round-trips, and validation.

### Modified Capabilities
- `app-settings`: ADDED — agents directory setting.
- `sidebar-navigation`: MODIFIED — tool list gains Agents.

## Impact

- **Server:** new `lib/agents.ts` (fourth sandboxed root; frontmatter parse-merge-serialize shared in approach with `lib/skills.ts`; deploy-status detection distinguishing symlinks from copies); new `app/api/agents/route.ts`; `lib/settings.ts` + Settings card.
- **UI:** `/agents` list + `/agents/edit`; NavLinks entry.
- **Docs:** PRD §11 delta row; CHANGELOG under **v0.12.0**. **Dependencies:** none; zero model calls.
