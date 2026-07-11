## 1. Settings + workflows library (server)

- [x] 1.1 `lib/settings.ts`: `workflowsDir` field (validated like `skillsDir`); Settings page card; `/api/settings` GET/PUT support
- [x] 1.2 Create `lib/workflows.ts`: third sandbox root; `listWorkflows()` (meta extraction via balanced-brace slice + Function-constructor literal eval, degrade to unreadable-meta entries; generated-marker detection; composition-edge regex; sync status vs `~/.claude/workflows` by content hash); `readWorkflow(name)` (meta + phases + edges + `builderModel` when generated); `writeWorkflow(model)` (codegen: marker, meta, builderModel, sequential phase/agent body with JSON.stringify-embedded instructions + skill name/description + previous-result threading; parse-validate with `new Function` before writing; dual-location write); `syncWorkflow(name)` (copy toolkit → `~/.claude`)
- [x] 1.3 Create `app/api/workflows/route.ts`: GET list / GET `?name=`, POST create, PUT update, POST `?action=sync`
- [x] 1.4 Verify by API: the three real workflows list with meta, phase counts, and sync status; `new-scala-pekko-service` reports a composition edge to `new-github-project`; a scratch generated workflow round-trips its model exactly; the generated file parses as JS and exists byte-identical in both locations; a deliberately drifted copy shows differs and the sync action heals it

## 2. Workflows UI

- [x] 2.1 NavLinks: Workflows entry (`/workflows*`); `/workflows` list page (cards: name, description, whenToUse, phases, generated + sync badges, sync button, "+ New workflow")
- [x] 2.2 `/workflows/edit` canvas: hand-rolled SVG vertical chain with auto-layout; view mode (phase nodes + dashed composition edges, no editing controls); build mode (add/remove/reorder steps, side panel: title, instructions, searchable skill picker from `/api/skills`, free-text fallback when unconfigured); save → POST/PUT
- [x] 2.3 Verify in browser: `new-scala-pekko-service` renders its five phases + dashed edge, no edit controls; build a scratch workflow (two steps, one wiring `requirements-engineering`), save, reopen → exact round-trip; generated file valid + dual-located; sync badge flow on the list
- [x] 2.4 Settings card verify: set `/Users/cference/Code/claude-toolkit/workflows`, invalid path rejected

## 3. Docs, versioning, release

- [x] 3.1 PRD §11 delta row; CHANGELOG under 0.11.0 (including the documented parallel fan-out follow-up); README (Workflows bullet)
- [ ] 3.2 Full verify pass over spec scenarios, feature-branch PR, human gate, merge, tag v0.11.0, archive (materialize `workflow-builder`, append `app-settings`, replace the sidebar requirement)
