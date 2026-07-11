## 1. Fix engine (server)

- [x] 1.1 Create `lib/skillFixes.ts`: inline Levenshtein; `computeFixes(name)` → per-finding fixes with line-scoped before/after diffs + contentHash (frontmatter-quote via error-anchored raw surgery verified by re-parse; name-sync via parse-merge-serialize; link replace ≤2 / unwrap otherwise); `applyFix(name, fixId, contentHash)` recomputing from disk, hash-guarded, post-verified
- [x] 1.2 Create `app/api/skills/fixes/route.ts`: GET `?name=` → available fixes; POST `{name, fixId, contentHash}` → apply; 409-style error on stale hash
- [x] 1.3 Verify by API on scratch skills reproducing each case: akka-style unquoted colon → fix offered, applied result parses, only the description line changed; name mismatch → synced; `[[akka-actor]]` → suggests `[[akka-actors]]`; `[[unrelated-thing]]` → unwrap only; stale-hash apply rejected; unfixable parse error offers nothing

## 2. Health panel (UI)

- [x] 2.1 Skill editor: Health panel listing findings; mechanical ones get Fix → inline before/after diff → Apply; panel refreshes after each apply; judgment findings render without a Fix button
- [x] 2.2 Verify in browser on a scratch skill with all three fixable findings: preview writes nothing, Apply clears the finding and the badge count drops, second finding still applies cleanly after the first shifted lines

## 3. Docs, versioning, release

- [x] 3.1 PRD §11 delta row; CHANGELOG under 0.9.0; README (health badges bullet gains "one-click verified fixes")
- [ ] 3.2 Full verify pass over spec scenarios, feature-branch PR, human gate, merge, tag v0.9.0, archive (append the three requirements to the living skill-builder spec)
