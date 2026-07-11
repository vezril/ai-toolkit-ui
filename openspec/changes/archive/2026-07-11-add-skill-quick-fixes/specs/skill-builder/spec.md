## ADDED Requirements

### Requirement: Mechanical findings offer verified quick-fixes
For a skill's health findings of the mechanical class, the system SHALL compute quick-fixes server-side and offer them per finding: (a) frontmatter that fails to parse due to an unquoted colon in a scalar value → quote the offending line, offered only when the repaired text verifiably parses; (b) frontmatter `name` missing or not equal to the directory name → set it to the directory name; (c) an unresolved `[[link]]` with a sibling skill at Levenshtein distance ≤ 2 → replace with that sibling; unresolved links with no close sibling SHALL only offer unwrapping (brackets removed, text kept). Judgment-class findings (description length, empty body) SHALL NOT offer a quick-fix.

#### Scenario: Broken frontmatter quotable
- **WHEN** a skill's description contains an unquoted `skills: a, b` sequence making the YAML unparseable
- **THEN** the health panel offers a fix whose applied result parses, with only the description line changed

#### Scenario: No fix without a safe repair
- **WHEN** frontmatter fails to parse for a reason line-quoting cannot repair
- **THEN** no Fix button is offered for that finding — only the editor itself

#### Scenario: Distant link gets no guess
- **WHEN** `[[completely-unrelated]]` resolves to no sibling within distance 2
- **THEN** the only offered action is unwrapping the link, never a replacement suggestion

### Requirement: Fixes preview as an inline diff and apply explicitly
Each offered fix SHALL present an inline before/after diff of exactly the lines it would change; the file SHALL NOT be modified until the user clicks Apply on that diff. Preview and apply SHALL be produced by the same server-side computation.

#### Scenario: Nothing writes on preview
- **WHEN** the user expands a fix's diff and navigates away
- **THEN** the skill file on disk is unchanged

#### Scenario: Apply changes only the diffed lines
- **WHEN** the user applies the name-sync fix
- **THEN** the file differs from its previous content only on the `name:` line

### Requirement: Stale previews cannot apply
Each fix preview SHALL carry a hash of the file content it was computed against; Apply SHALL be rejected with a clear error when the file has changed since the preview, requiring a re-preview.

#### Scenario: Concurrent edit guarded
- **WHEN** a fix is previewed, the skill is edited elsewhere, and Apply is then clicked
- **THEN** the API rejects the apply naming the stale preview and no write occurs
