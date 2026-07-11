## MODIFIED Requirements

### Requirement: Persistent left sidebar hosts all tool navigation
The app SHALL render a persistent left sidebar on every page containing navigation entries for each tool — Dashboard, New evaluation, Runs, Skills, Agents, Workflows — and a Settings entry pinned at the bottom. The sidebar SHALL replace the top navigation as the primary navigation surface, and the main content area SHALL occupy the remaining width to the right.

#### Scenario: Sidebar present on every page
- **WHEN** any page of the app is loaded (`/`, `/new`, `/config`, `/runs`, `/runs/[id]`, `/skills`, `/skills/edit`, `/agents`, `/agents/edit`, `/workflows`, `/workflows/edit`, `/settings`)
- **THEN** the left sidebar is visible with entries for Dashboard, New evaluation, Runs, Skills, Agents, Workflows, and Settings

#### Scenario: Navigation via sidebar
- **WHEN** the user clicks a sidebar entry
- **THEN** the app navigates to that tool's route without a full page reload (client-side navigation)
