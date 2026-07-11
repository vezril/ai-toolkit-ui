# sidebar-navigation

## Purpose
The persistent left sidebar hosting all tool navigation with active-state indication and responsive collapse.
## Requirements
### Requirement: Persistent left sidebar hosts all tool navigation
The app SHALL render a persistent left sidebar on every page containing navigation entries for each tool, in order — Dashboard, New evaluation, Runs, Agents, Skills, Workflows — and a Settings entry pinned at the bottom. The sidebar SHALL replace the top navigation as the primary navigation surface, and the main content area SHALL occupy the remaining width to the right.

#### Scenario: Sidebar present on every page
- **WHEN** any page of the app is loaded (`/`, `/new`, `/config`, `/runs`, `/runs/[id]`, `/agents`, `/agents/edit`, `/skills`, `/skills/edit`, `/workflows`, `/workflows/edit`, `/settings`)
- **THEN** the left sidebar is visible with entries for Dashboard, New evaluation, Runs, Agents, Skills, Workflows, and Settings

#### Scenario: Tool order
- **WHEN** the sidebar renders its tool entries
- **THEN** they appear in the order Dashboard, New evaluation, Runs, Agents, Skills, Workflows, with Settings pinned at the bottom

#### Scenario: Navigation via sidebar
- **WHEN** the user clicks a sidebar entry
- **THEN** the app navigates to that tool's route without a full page reload (client-side navigation)

### Requirement: Active tool is visually indicated
The sidebar SHALL visually highlight the entry corresponding to the current route, including nested routes (e.g. `/runs/some-id` highlights Runs; `/config?...` highlights Dashboard as its parent tool).

#### Scenario: Direct route highlight
- **WHEN** the user is on `/runs`
- **THEN** the Runs entry renders in the active state and no other entry does

#### Scenario: Nested route highlight
- **WHEN** the user is on `/runs/2026-07-10T20-04-10-824Z-abc123`
- **THEN** the Runs entry renders in the active state

### Requirement: Sidebar adapts to narrow viewports
On viewports narrower than 900px the sidebar SHALL collapse to an icon-only rail so the content area remains usable; entry labels SHALL remain accessible (e.g. via `title`/`aria-label`).

#### Scenario: Narrow viewport collapse
- **WHEN** the viewport width is below 900px
- **THEN** the sidebar shows icons without text labels and the content area keeps at least 75% of the viewport width

