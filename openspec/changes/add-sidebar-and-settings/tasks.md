## 1. Settings foundation (server)

- [x] 1.1 Create `lib/settings.ts`: settings-file path resolution (`~/.ai-toolkit-ui/settings.json`), lazy read with missing-file → empty settings, write with `0o600` mode enforcement, `maskKey()` (last 4 chars), `settingsEnv()` mapping stored keys to `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GOOGLE_API_KEY`
- [x] 1.2 Create `app/api/settings/route.ts`: GET (masked entries only), PUT (upsert one provider key, validate non-empty + known provider), DELETE (remove provider key); force-dynamic
- [x] 1.3 Verify by API: PUT a key → file exists with 0600 and correct JSON; GET returns masked form only; DELETE removes it; no writes occur under `REPO_ROOT`

## 2. Sidebar shell

- [x] 2.1 Rework `app/layout.tsx`: CSS-grid shell (sidebar + content), brand at top, nav entries Dashboard / New evaluation / Runs, Settings pinned at bottom; extract active-link highlighting into client `app/components/NavLinks.tsx` using `usePathname` (nested-route matching: `/runs/*` → Runs, `/config` → Dashboard)
- [x] 2.2 Update `app/globals.css`: sidebar styles (fixed-width rail, active state, bottom-pinned settings), content-area grid, icon-only collapse below 900px with `title`/`aria-label` on entries
- [x] 2.3 Verify in browser: sidebar on all six routes, correct active highlight per route incl. `/runs/[id]`, collapse behavior at narrow width, no layout breakage on existing pages

## 3. Settings page (UI)

- [x] 3.1 Create `app/settings/page.tsx`: API-keys section listing Anthropic/OpenAI/Google cards — unconfigured (input + Save) and configured (masked value, set-date, Replace/Remove) states, using the existing card/field styles
- [x] 3.2 Verify in browser: add key → masked display after save and reload; replace and remove flows; removing a key flips the builder gating (after task 5)

## 4. Direct API providers (draft model + serialization)

- [x] 4.1 Extend `lib/evals.ts`: add `API_PROVIDER_CATALOG` (anthropic/openai/google: label, env var, model suggestions); extend `ModelDraft` with `kind: 'cli' | 'api'`; serialize enabled API entries to promptfoo-native provider ids (`anthropic:<model>`, `config.max_tokens`); parse the three id prefixes back into drafts; judge selection supports API providers via `defaultTest.options.provider: <id>` *(catalog lives in `lib/settings.ts` as `API_PROVIDERS` to avoid a settings→evals import cycle)*
- [x] 4.2 Add server-side key gating to `validateDraft`: enabling an API provider (or choosing an API judge) without its stored key → validation error naming the provider
- [x] 4.3 Inject `settingsEnv()` into the spawn env in `lib/runs.ts` `startRun`; confirm keys never appear in args, log, meta.json, or generated YAML

## 5. Direct API providers (builder UI)

- [x] 5.1 Update `app/new/page.tsx`: model grid rendered as two groups (CLI runners / API providers); API cards show toggle+model+max-tokens like CLI cards, disabled with a "Add key in Settings →" link when keyless; judge picker lists configured API providers; `/api/evals` GET response extended with key-availability map
- [x] 5.2 Verify in browser: keyless card gated with settings link; after adding a key the card enables; save → inspect generated YAML (native id, no key material); Edit in builder round-trips the API provider; server rejects a forged keyless draft with 400

## 6. Docs, versioning, release

- [ ] 6.1 PRD delta: mark A3 superseded, extend FR-10/FR-16, note the new NFR for key storage/masking; new ADR-0009 (app-level plaintext key file, 0600, masked reads — alternatives and accepted risk)
- [ ] 6.2 Bump `package.json` to 0.3.0; CHANGELOG entry (Added: sidebar, settings + API keys, direct API providers); update README features + setup
- [ ] 6.3 Full verify pass (all specs' scenarios exercised in browser), PR on a feature branch, human gate, merge, tag v0.3.0
