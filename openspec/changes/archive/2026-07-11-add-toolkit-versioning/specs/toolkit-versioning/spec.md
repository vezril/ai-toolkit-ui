## ADDED Requirements

### Requirement: UI saves commit to the component's git repository
When a component directory (workflows, skills, agents) resolves inside a git repository, every UI save SHALL: write the component file(s), bump the patch version in that directory's `versions.json`, stage **only the files the app wrote**, and commit on the current branch with a message naming the component and new version. The app SHALL never switch branches, and files it did not write SHALL never appear in its commits.

#### Scenario: Scoped commit alongside unrelated dirty files
- **WHEN** the repo has unrelated uncommitted edits and the user saves a workflow through the UI
- **THEN** a new commit exists containing exactly the workflow file and `versions.json`, the unrelated edits remain uncommitted, and the branch is unchanged

#### Scenario: Version stamped
- **WHEN** a component at v1.2.0 is saved
- **THEN** `versions.json` records v1.2.1 mapped to the new commit

### Requirement: History and forward-only restore
Each versioned component SHALL offer a history panel (versions with dates and messages, from `git log --follow` joined with `versions.json`) and a Restore action that copies the selected version's content **forward** as a new save-commit ("restored from vX.Y.Z"). Restore SHALL never check out past commits; a dirty target file SHALL be auto-committed before restoring so no content is ever lost.

#### Scenario: Restore is a new version
- **WHEN** the user restores v1.0.0 of a component currently at v1.2.1
- **THEN** the file content equals v1.0.0, `versions.json` records v1.2.2 with a restore message, and all prior commits remain reachable

#### Scenario: Dirty file preserved
- **WHEN** the target file has uncommitted changes and Restore is clicked
- **THEN** those changes are committed first as their own version, then the restore commit follows

### Requirement: Ship batches commits into a gated PR
A Ship action SHALL push the current branch to the remote side branch `toolkit-ui-ship` (no local branch switch) and create a pull request via `gh`, batching all accumulated app commits. The app SHALL surface the pending-commit count (local commits not on the remote default branch). Merging remains the user's action.

#### Scenario: Ship with protected main
- **WHEN** the repo's main is protected and the user clicks Ship with three app commits pending
- **THEN** `toolkit-ui-ship` exists on the remote containing them, a PR is open, and no local branch changed

### Requirement: Graceful degradation outside git
When a component directory does not resolve inside a git repository, saves SHALL behave as plain writes and all versioning UI (history, restore, Ship, version badges) SHALL be hidden — never an error.

#### Scenario: Non-git directory
- **WHEN** the skills directory points outside any git repo
- **THEN** skill saves succeed as before and no versioning controls render
