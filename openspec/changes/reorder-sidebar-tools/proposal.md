## Why

The sidebar tool order grew by insertion (Agents landed after Skills in v0.12.0), leaving Skills before Agents. Calvin wants the toolkit-component tools ordered Agents → Skills → Workflows, matching how he thinks about them.

## What Changes

- Reorder the sidebar tool entries to: **Dashboard, New evaluation, Runs, Agents, Skills, Workflows** (Settings stays pinned at the bottom). The only move is Agents ahead of Skills; no routes, active-state logic, or icons change.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `sidebar-navigation`: MODIFIED — the enumerated tool order in the nav requirement.

## Impact

- **UI:** `app/components/NavLinks.tsx` — reorder two entries in the `TOOLS` array.
- **Docs:** CHANGELOG under **v0.13.1** (patch — cosmetic reorder). **Dependencies:** none.
