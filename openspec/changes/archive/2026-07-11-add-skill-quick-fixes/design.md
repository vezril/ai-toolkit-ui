## Context

Explored (opsx:explore, 2026-07-11) and decided: per-skill quick-fixes first (bulk sweep deferred), inline diff previews, Levenshtein ≤ 2 for link suggestions, "as safe as possible," and no AI-assisted fixes — the app's no-direct-model-calls boundary stays uncrossed. Building blocks: the skill validator and health findings (`lib/skills.ts`, v0.4.0), the byte-identical parse-merge-serialize round-trip (ADR-0010), and the editor's existing warnings UI.

## Goals / Non-Goals

**Goals:**
- One-click, individually verified fixes for the three mechanical finding types, each behind a diff the user approves.
- The same server code computes preview and apply — what you see is exactly what's written.

**Non-Goals:**
- Bulk "fix all" sweep (follow-up once fixers earn trust).
- AI-assisted description/body rewrites (would be the app's first direct model call; deliberately out).
- Fixing judgment-class findings, nested-SKILL.md errors (which involve moving/deleting files), or anything requiring content authorship.
- Auto-apply, fix chaining, or fixing on save.

## Decisions

1. **Two repair strategies by parse state.** Parseable frontmatter (name-sync) goes through the proven parse-merge-serialize path. Unparseable frontmatter (scalar quoting) gets **raw-text surgery**: locate the offending line via the YAML error position, wrap the value in double quotes (escaping embedded quotes), then **verify by re-parsing** — the fix is only offered if verification passes, so the Fix button itself is the proof of repairability. Link repairs are body-text replacements (no frontmatter involvement).
2. **Preview = apply, hash-guarded.** `computeFixes(name)` returns `{fixId, finding, diff: {before[], after[]}, contentHash}` per fix; `applyFix(name, fixId, contentHash)` recomputes from current disk content, rejects on hash mismatch, writes, then re-runs the validator to confirm the finding cleared. No client-supplied patch content — the client only ever names a fix.
3. **Levenshtein inline** (~15 lines, classic DP) — no dependency; candidates ranked by distance then alphabetically; ties at distance ≤ 2 surface only the closest.
4. **Unwrap, don't delete** for hopeless links — `[[x]]` becomes `x`, preserving prose flow; deleting text from a hand-authored body is never the tool's call.
5. **Health panel on the editor only** — the list badges already link there; one surface keeps the diff UI in the place with room for it.
6. **Diffs are line-scoped** — before/after arrays of only the affected lines (with line numbers), not whole-file diffs; the spec's "only the diffed lines change" scenario is checked by comparing full file content before/after apply during verification.

## Risks / Trade-offs

- [Quoting surgery guesses the wrong line] → the YAML parse error's position anchors the line; verification-by-reparse gates the offer; worst case the fix isn't offered. No fix is ever applied unverified.
- [Multiple findings interact (fixing one shifts another's line numbers)] → fixes recompute from disk at apply time; the UI refreshes the panel after each apply. One at a time by design.
- [Hash race with an external editor] → exactly what the stale-preview guard rejects; the user re-opens the preview.
- [Levenshtein ≤ 2 misses real typos at distance 3] → accepted; the unwrap action remains, and false suggestions are costlier than missed ones (Calvin's call: safest possible).

## Migration Plan

Single PR, **v0.9.0** (minor). Purely additive. Rollback = revert; skills are git-tracked in their own repo regardless.

## Open Questions

- None — scope settled in the explore session.
