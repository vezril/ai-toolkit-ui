# ADR-0001: Standalone Next.js app operating on an external target project via `PROJECT_ROOT`

**Status:** Accepted (retroactive)

## Context

The UI originally lived inside the promptfoo project repository it operated on. It was extracted into its own repository (`ai-toolkit-ui`), decoupling the tool's release cycle from any single target project's. The app still needs to read and write files that live in someone else's promptfoo project directory — configs, prompts, provider scripts, run artifacts.

## Decision

The app resolves the directory it operates on from an environment variable, `PROJECT_ROOT` (`lib/paths.ts`), falling back to `path.resolve(process.cwd(), '..')` — the parent directory — for the legacy layout where the app lived one level inside the target project. All file discovery, editing, and run-spawning is relative to this resolved `REPO_ROOT`. The app is versioned and shipped independently (its own `package.json`, `CHANGELOG.md`, semver) from any target project.

## Consequences

- The same UI binary/checkout can be pointed at any promptfoo project by changing one env var — no per-project fork or install step.
- The UI's own release cadence (bug fixes, new builder features) is decoupled from any single target project's history.
- The fallback-to-parent-directory behavior is a compatibility shim for the pre-extraction layout; it is easy to trigger accidentally (unset `PROJECT_ROOT` in a fresh clone silently resolves to whatever the parent directory happens to be, not an error) — a misconfigured `PROJECT_ROOT` fails open to "some directory" rather than failing closed.
- `REPO_ROOT` is computed once at module load (`lib/paths.ts` top-level `path.resolve(...)`), so switching target projects requires restarting the process — there is no in-app "switch project" capability (see architecture.md §8, Future Pressure Points).
- `PROJECT_ROOT` is trusted input (A2 in the PRD): the app assumes Calvin sets it to a directory he owns. There is no validation that it actually contains a promptfoo project (e.g., no check for `promptfooconfig.yaml`) before the app starts serving requests against it.
