## Context

v0.3.0 baseline: sidebar shell, settings store (`lib/settings.ts`, `~/.ai-toolkit-ui/settings.json`, masked API keys), eval builder with the form-over-YAML pattern, path sandbox scoped to `REPO_ROOT`. Skills are a separate artifact type living in a directory the user chooses (his `claude-toolkit/skills` being the motivating example) — outside the promptfoo target project, so the existing sandbox deliberately cannot reach it.

## Research findings (what "good" means for a skill builder)

Sources: Anthropic's Claude Code skills documentation (fetched 2026-07-10), the Agent Skills open standard (agentskills.io), and `claude-toolkit/docs/skill-and-agent-evaluation.md`.

1. **A skill is a directory + `SKILL.md`**: YAML frontmatter (`name`, `description`) + markdown body. The body loads only on trigger (progressive disclosure), so body length is cheap; the **description is always in context** and is the artifact that determines triggering — it's the highest-leverage field and the one the form should coach hardest.
2. **Description discipline** (toolkit eval doc + docs): third person, states what the skill covers AND when to use it, includes concrete trigger phrases; recommended length band 200–1500 chars (toolkit lint rule); the open standard caps it at 1024. Both bounds surface in the form as live feedback — band as warning, not a hard block (several shipped toolkit skills exceed 1024 and work; warn, don't refuse).
3. **Structural health is a mechanical gate** (toolkit eval doc): `name` == directory name, kebab-case; frontmatter parses; no nested `SKILL.md`; `[[links]]` resolve to sibling skills. These are exactly the checks a builder can enforce at save time for free — the eval doc's Dimension 1 moved from CI to the editor.
4. **Optional frontmatter worth exposing** (docs frontmatter reference): `disable-model-invocation` (manual-only workflows), `user-invocable` (hide background knowledge from the `/` menu), `allowed-tools`, `argument-hint`. The rest (`model`, `effort`, `context: fork`, `agent`, `hooks`) is expert territory — the body editor plus preserved unknown fields covers it without form sprawl.
5. **Triggering accuracy and output quality** (eval doc Dimensions 2–3) need model runs and eval sets — out of scope for a builder form; explicitly deferred (see Non-Goals) rather than half-built.

## Goals / Non-Goals

**Goals:**
- List/create/edit skills in one configured directory with the same form-over-config UX as the eval builder.
- Bake the research into the form (coached description field) and the save path (structural validator: errors block, warnings inform).
- Never lose hand-authored content: unknown frontmatter fields and the full body round-trip untouched.

**Non-Goals:**
- Trigger-accuracy or A/B quality evals of skills (the toolkit's skill-creator harness owns that; a future change could surface it).
- AI-assisted skill drafting (would need the API-provider plumbing pointed at authoring, not evaluating — separate proposal).
- Multi-directory skill management, plugin packaging/marketplace manifests, agents/commands authoring.
- Editing supporting files (references/, scripts/) beyond noting their existence in the list view.

## Decisions

1. **Second sandboxed root, same pattern** — new `resolveSkillPath()` in `lib/skills.ts` mirroring `resolveRepoPath()`: resolve against `skillsDir` from settings, reject escapes via `path.relative` + `fs.realpathSync` on the parent (the skills dir is user-trusted, same as `PROJECT_ROOT`, per PRD A2). Eval and skill roots stay in separate modules with no shared resolver, so neither can be coaxed into the other's tree. Alternative (generalize `resolveRepoPath` to take a root) rejected: a shared resolver invites accidentally passing the wrong root; two small explicit functions are safer than one parameterized one.
2. **`skillsDir` lives in the existing settings store** — new top-level field in `settings.json`, exposed via the existing `/api/settings` GET/PUT (a `skillsDir` body key), validated server-side (absolute + `fs.statSync().isDirectory()`). No new storage mechanism.
3. **Frontmatter round-trip via parse-merge-serialize** — read `SKILL.md`, split frontmatter with the `yaml` package, overlay only the form-modeled fields, re-serialize the merged object. Unknown fields (`license`, `metadata`, `model`, …) survive by construction (spec: "Editing preserves unknown frontmatter"). This is the opposite trade from the eval builder's bounded-fidelity contract (ADR-0004) — justified because skills are hand-authored artifacts the builder joins, not artifacts the builder owns.
4. **Validation tiers mirror the eval doc's gate/score split** — errors (malformed name, name≠dir, empty description/body, nested SKILL.md, traversal) return 400; warnings (length band, 1024 cap, unresolved `[[links]]`) return 200 with a `warnings` array the UI renders inline. Keeps the builder opinionated without blocking legitimate exceptions.
5. **Two pages, not a modal** — `/skills` (list + health badges + "New skill") and `/skills/edit?name=…` (create when no name, edit otherwise), matching the dashboard/builder navigation grammar and giving the editor full width for the body textarea.
6. **List health badges are computed by the same validator** used at save time (run in read mode per skill) — one source of truth for "healthy."

## Risks / Trade-offs

- [User edits skills in another editor while the form is open] → last-write-wins, same stance as FileEditor (PRD non-goal on concurrent editing); the list view always re-reads from disk.
- [Symlinked skills dirs (his `~/.claude/skills` entries symlink into claude-toolkit)] → the sandbox resolves real paths for containment but must not refuse symlinked *children*; verify with a symlinked skill during implementation.
- [Frontmatter YAML edge cases (multiline descriptions, quoting)] → the `yaml` package handles serialization; round-trip tests on real toolkit skills (tdd, clean-code) during verification.
- [Warning fatigue if the band is too strict] → warnings are advisory copy, one line each, never modal.

## Migration Plan

Single PR, **v0.4.0** (minor). No migration: absent `skillsDir` renders the Skills tool in its unconfigured state. Rollback = revert; the settings field is forward-inert.

## Open Questions

- Should the list view also surface each skill's supporting files (references/, scripts/) as a read-only inventory? (Cheap, informative — leaning yes if trivial.)
- Badge for description-over-1024 on *existing* toolkit skills: several will warn on day one — acceptable noise, or should the standard-cap warning apply only to newly created skills?
