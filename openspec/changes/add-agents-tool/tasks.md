## 1. Settings + agents library (server)

- [x] 1.1 `lib/settings.ts`: `agentsDir` (validated like skills/workflows); Settings DirCard; `/api/settings` support
- [x] 1.2 Create `lib/agents.ts`: fourth configured root; list (flat `*.md` minus README; name/description/tools/health/deploy status incl. symlink detection); read (form model + unknown-key preservation); write (create/update, kebab+filename validation, description-band + unknown-tool warnings); create `app/api/agents/route.ts`
- [x] 1.3 Verify by API against the real 35 agents: list with symlinked deploy badges; round-trip `implementer.md` byte-identical apart from edited fields (block-scalar description survives); unknown frontmatter key preserved; "Grpe" tool warned; collision + traversal rejected

## 2. Agents UI

- [x] 2.1 NavLinks Agents entry; `/agents` list page (cards + badges, "+ New agent"); `/agents/edit` editor (locked name on edit, coached description, tools, model, body; warnings inline)
- [x] 2.2 Verify in browser: list renders all agents with deploy badges; open `implementer`, fields populate; create + edit a scratch agent, verify on disk, delete it

## 3. Docs, versioning, release

- [x] 3.1 PRD §11 delta row; CHANGELOG under 0.12.0; README (Agents bullet)
- [ ] 3.2 Full verify pass, feature-branch PR, human gate, merge, tag v0.12.0, archive (materialize `agents-tool`, append `app-settings`, replace sidebar requirement)
