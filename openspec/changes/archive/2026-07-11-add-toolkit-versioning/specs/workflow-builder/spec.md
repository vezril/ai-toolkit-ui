## ADDED Requirements

### Requirement: Hand-written workflows are editable within declared bounds
Hand-written workflow scripts SHALL offer, alongside the read-only canvas: a raw-source editor tab (explicit save, like other file editors) and a meta-surgery form editing only the `meta` literal's description, `whenToUse`, and phase titles/details — the script body SHALL never be modified by the form. Both paths save through the versioning choreography when available.

#### Scenario: Meta surgery leaves the body untouched
- **WHEN** the user edits a hand-written workflow's description via the meta form and saves
- **THEN** the file's `meta` block reflects the change, the body is byte-identical, and a version commit exists

### Requirement: Version-aware sync badges
For copy-style `~/.claude/workflows` twins, sync badges SHALL show versions when known ("v1.3.0 local · v1.2.0 deployed") rather than only "differs", using `versions.json`'s `deployedVersion` recorded at sync time.

#### Scenario: Deploy version visible
- **WHEN** a workflow at v1.3.0 was last synced at v1.2.0
- **THEN** the list badge names both versions
