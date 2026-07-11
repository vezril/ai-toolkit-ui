## Why

The skill health badges (v0.4.0) diagnose but don't cure — every finding, however mechanical, means hand-editing a file (the akka frontmatter defect is being hand-fixed in a separate session right now). The mechanical class of findings has deterministic, verifiable fixes; offering them as one-click actions with a diff preview deletes that labor while keeping every write under the user's eyes.

## What Changes

- **Quick-fix actions** for the mechanical finding class only (explored and decided; AI-assisted fixes stay behind the app's no-direct-model-calls line, bulk sweep deferred until the fixers earn trust):
  1. **Quote broken frontmatter scalar** — when frontmatter fails to parse because of an unquoted `:` in a value (the akka case): targeted raw-text surgery quoting the offending line, offered only if the result verifiably parses.
  2. **Sync `name` to directory** — sets the frontmatter `name` to the directory name when missing or mismatched.
  3. **Fuzzy `[[link]]` repair** — unresolved links with a sibling at Levenshtein distance ≤ 2 get a "did you mean [[x]]?" replacement; anything farther only offers "unwrap" (drop the brackets, keep the text). Wrong guesses are worse than no guesses.
- **Health panel on the skill editor**: per-finding rows; mechanical findings carry a Fix button that expands an **inline before/after diff** — nothing writes until Apply is clicked on that diff.
- **Safety rails**: fixes are computed and previewed server-side by the same code that applies them; each preview carries a content hash and Apply is rejected if the file changed since preview; every fix is verified post-surgery (frontmatter re-parses / link resolves / name matches) before the write is kept; one fix at a time, never chained automatically.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `skill-builder`: ADDED requirements — the quick-fix catalog, the diff-preview-then-apply flow, and the stale-preview guard.

## Impact

- **Server:** new `lib/skillFixes.ts` (fix detection, diff computation, hash-guarded apply, inline Levenshtein — no dependencies); new `app/api/skills/fixes/route.ts` (GET available fixes with diffs, POST apply).
- **UI:** skill editor gains a Health panel (findings + Fix/diff/Apply); list badges unchanged (they already link to the editor).
- **Safety surface:** raw-text surgery touches only the targeted line(s) — the diff is the proof; all other content round-trips untouched per the ADR-0010 stance.
- **Docs:** PRD §11 delta row; CHANGELOG under **v0.9.0**.
- **Dependencies:** none; zero model calls.
