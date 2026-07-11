## 1. Settings: skills directory

- [x] 1.1 Extend `lib/settings.ts` with a `skillsDir` field: getter, setter with validation (absolute path, exists, is a directory), included in the GET response shape; extend `app/api/settings/route.ts` PUT to accept `{ skillsDir }` (and an explicit empty string to clear it)
- [x] 1.2 Add a "Skills directory" section to `app/settings/page.tsx` (path input with the claude-toolkit example as placeholder, Save/Clear, inline error for invalid paths)
- [x] 1.3 Verify by API + browser: valid path saves and persists; `/no/such/dir` rejected 400 retaining the old value; clearing works

## 2. Skills library (server)

- [x] 2.1 Create `lib/skills.ts`: `resolveSkillPath()` sandbox against `skillsDir`; `listSkills()` (direct child dirs with SKILL.md → name, description preview, health); SKILL.md parse (frontmatter + body split) and serialize (merge form fields over existing frontmatter, preserving unknown keys)
- [x] 2.2 Add the structural validator: errors (kebab-case name ≤64, name==dir, non-empty description/body, no nested SKILL.md, no traversal) and warnings (description <200 or >1500, >1024 standard cap, unresolved `[[links]]` against sibling dirs)
- [x] 2.3 Create `app/api/skills/route.ts`: GET list, POST create (400 on collision or validation error, 200 + warnings otherwise); GET `?name=` returns one skill's parsed form model; PUT updates an existing skill
- [x] 2.4 Verify by API against the real claude-toolkit skills dir: list returns his skills; round-trip a real skill (e.g. `tdd`) unchanged byte-for-byte apart from edited fields; traversal name rejected; unknown frontmatter (`license`) preserved

## 3. Skills tool (UI)

- [x] 3.1 Add the Skills entry to `app/components/NavLinks.tsx` (icon ⬡ or similar, active on `/skills*`)
- [x] 3.2 Create `app/skills/page.tsx`: unconfigured state (link to Settings); configured state — skill cards (name, description preview, health badge: ✓ / N warnings / N errors) + "New skill" button
- [x] 3.3 Create `app/skills/edit/page.tsx`: create/edit form — name (locked when editing), coached description textarea with live char count colored by band (red <200/>1500, note at >1024), body editor, Advanced frontmatter section (`disable-model-invocation`, `user-invocable`, `allowed-tools`, `argument-hint`); save shows returned warnings inline
- [x] 3.4 Verify in browser against claude-toolkit: list renders with health badges; open `tdd`, confirm fields populate; create a scratch skill, confirm SKILL.md on disk and its list card; delete the scratch skill dir afterward

## 4. Docs, versioning, release

- [x] 4.1 PRD §11 delta row for `add-skill-builder`; ADR-0010 (second sandboxed root for the user-configured skills directory; parse-merge-serialize round-trip stance vs ADR-0004's bounded fidelity)
- [x] 4.2 Bump to 0.4.0; CHANGELOG entry; README features section
- [ ] 4.3 Full verify pass over the spec scenarios, feature-branch PR, human gate, merge, tag v0.4.0, archive the change (sync deltas into living specs)
