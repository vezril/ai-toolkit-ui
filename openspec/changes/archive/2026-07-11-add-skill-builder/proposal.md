## Why

Calvin authors Claude Code skills by hand in `claude-toolkit/skills/` — YAML frontmatter conventions, description-writing discipline, and structural rules (name==dir, resolvable links, length bands) all held in his head and enforced by manual review. The app's whole thesis is "forms over hand-written config"; a Skill Builder extends that thesis from promptfoo evals to Agent Skills, with the authoring best practices researched once and baked into the form and its validator instead of re-remembered every time.

## What Changes

- New **Skills tool** in the left sidebar: lists every skill in a configured skills directory (name, description preview, structural-health badges) and opens a create/edit form.
- **Skill create/edit form**: kebab-case name (directory derived automatically), description editor with research-backed guidance (trigger phrases, third-person "Use when…", live length indicator against the 200–1500-char band / 1024-char standard cap), markdown body editor, and an "Advanced frontmatter" section for the documented optional fields (`disable-model-invocation`, `user-invocable`, `allowed-tools`, `argument-hint`).
- **Structural validation** on save, derived from claude-toolkit's evaluation framework: errors (missing/invalid name, name≠dir, empty description, nested SKILL.md) block; warnings (description outside length band, unresolvable `[[links]]`) surface inline but don't block.
- **Settings gains a "Skills directory" entry**: an absolute path where skills live (example: `/Users/cference/Code/claude-toolkit/skills`), stored in `~/.ai-toolkit-ui/settings.json` alongside API keys. The Skills tool is disabled with a settings link until it's set.
- **Second sandboxed root**: skill file access is confined to the configured skills directory via the same resolve-and-reject pattern `lib/paths.ts` uses for `REPO_ROOT` — the two roots never mix.

## Capabilities

### New Capabilities
- `skill-builder`: list, create, and edit Agent Skills (SKILL.md) in the configured skills directory, with best-practice guidance and structural validation built into the form.

### Modified Capabilities
- `sidebar-navigation`: the tool list gains a Skills entry (requirement enumerates the nav entries, so it must be updated).
- `app-settings`: new requirement — a configurable skills-directory path in the settings store and page (extends the settings page beyond API keys, which its spec anticipated as "sections").

## Impact

- **Server:** new `lib/skills.ts` (skills-root resolution + sandbox, SKILL.md parse/serialize, structural validator); new `app/api/skills/route.ts` (+ `[name]` route); `lib/settings.ts` extended with `skillsDir`.
- **UI:** new `app/skills/page.tsx` (list) and `app/skills/edit/page.tsx` (form); `NavLinks` gains a Skills entry; Settings page gains a path field.
- **Docs:** PRD §11 delta row (new capability; FR additions), ADR-0010 (second sandboxed root for a user-configured external directory); CHANGELOG under **v0.4.0** (minor bump).
- **Research grounding (see design.md):** Anthropic Claude Code skills docs (frontmatter reference, invocation control, progressive disclosure), the Agent Skills open standard (agentskills.io), and `claude-toolkit/docs/skill-and-agent-evaluation.md` (structural-health gate, description length band, trigger-accuracy framing).
- **Dependencies:** none added.
