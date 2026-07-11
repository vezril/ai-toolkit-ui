# ADR-0010: Skills directory as a second sandboxed root with full-fidelity round-trips

**Status:** Accepted

## Context

The Skill Builder (v0.4.0, `add-skill-builder` change) operates on Agent Skills living in a user-configured directory (e.g. `~/Code/claude-toolkit/skills`) — outside the promptfoo target project, so deliberately unreachable through the eval sandbox (`lib/paths.ts` / `REPO_ROOT`, ADR-0005). Skills are hand-authored, version-controlled artifacts with frontmatter richer than any form can model.

## Decision

`lib/skills.ts` owns a **second, independent sandbox root**: the `skillsDir` path from app settings (ADR-0009's store), validated at set-time (absolute, exists). Skill names are gated by the kebab-case pattern (which structurally excludes traversal) plus a containment check; the eval resolver and the skill resolver are separate functions in separate modules that never share a root parameter. Skill writes use **parse-merge-serialize**: only form-modeled frontmatter fields (`name`, `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `argument-hint`) are overlaid; all other keys and the body round-trip untouched. Structural validation runs at save time — errors (kebab name, name==dir, empty description/body) block; warnings (description length band 200–1500, the standard's 1024 cap, unresolved `[[links]]`) inform.

## Consequences

- Two explicit resolvers beat one parameterized resolver: no code path can accidentally hand the eval root to a skill operation or vice versa; each module's security boundary stays a one-function audit.
- Full-fidelity round-trips are the opposite stance from the eval builder's bounded fidelity (ADR-0004), and deliberately so: the eval builder owns its generated files, while the skill builder joins files a human owns — hand-authored frontmatter (e.g. `license`, `model`, `context: fork`) must survive edits it doesn't understand. Verified byte-identical on a real hand-written skill.
- The `skillsDir` is trusted input like `PROJECT_ROOT` (PRD A2): the sandbox protects against path bugs, not a hostile directory choice.
- Frontmatter is re-serialized by the `yaml` package on every save (`lineWidth: 0` to keep single-line descriptions single-line) — semantically lossless, but hand formatting quirks (comments inside frontmatter, unusual quoting) may normalize. Comments in skill frontmatter are rare; accepted.
- Validation thresholds encode `claude-toolkit`'s house rules (the evaluation framework's structural-health gate). Other skill repos inherit those opinions as warnings — advisory, never blocking, so the coupling is soft.
- One instance of the app manages one skills directory at a time (same single-root stance as ADR-0001's `PROJECT_ROOT`).
