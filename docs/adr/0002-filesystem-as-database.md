# ADR-0002: Filesystem as the system of record; no database

**Status:** Accepted (retroactive)

## Context

The app needs to persist eval configs, prompt files, and run history durably, in a way that survives app reinstalls and stays under the user's own version control. The user is already running these evals inside a git repository (the target project) that promptfoo itself already treats as the source of truth for configs.

## Decision

No database (SQL, embedded, or otherwise) is used anywhere in the stack. All state — eval configs (YAML), prompts (Markdown), run metadata (`eval-runs/<id>.meta.json`), and run results (`eval-runs/<id>.json`) — is read from and written directly to files inside the target project's own directory tree, which is the target project's own git repository, not the UI app's repository (FR-21).

## Consequences

- Deleting or reinstalling the UI app never deletes any user data — everything lives in the target project.
- All persisted data is automatically version-controlled by whatever git workflow the target project already uses; no separate backup/migration story is needed for the UI.
- There is no query capability beyond "scan and parse everything" — `listConfigs()` re-reads and re-parses every discovered YAML file on every dashboard load (FR-2's consequence: badges are "always derived live from the YAML on disk, never cached"); this is only acceptable because target-project scale is small and scan depth is capped (NFR-8).
- There is no transactional guarantee across a config file and its paired prompt file (`draftToFiles`/`writeEvalFiles` writes them as two sequential `fs.writeFileSync` calls) — a crash between the two writes leaves an inconsistent pair on disk with no automatic recovery.
- No indexing means no fast lookup by anything other than full-directory-scan; this doesn't matter at current scale but would need revisiting if the target project or run history grew by orders of magnitude.
- Concurrent writers (two browser tabs, or the UI and a hand-edit from an external editor happening at once) resolve as last-write-wins with no conflict detection — accepted per the PRD's explicit non-goal on real-time collaborative editing.
