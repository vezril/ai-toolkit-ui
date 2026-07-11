# eval-ab-comparison

## Purpose
Two-prompt blind A/B comparison evals: comparison prompt, select-best winner checks, and variant-aware results with win tallies.

## Requirements

### Requirement: Builder supports an optional comparison prompt
The eval builder SHALL support an optional second prompt ("comparison prompt B") with its own editor section. When set, the generated config SHALL list two prompt files (`<slug>.prompt.md`, `<slug>.b.prompt.md` — or the pair provided by a generator such as the skill A/B action) under `prompts:`, and promptfoo runs every test case against both. Builder round-trip SHALL restore both prompts; clearing prompt B removes the second entry and its file reference.

#### Scenario: Two-prompt config round-trips
- **WHEN** an eval with a comparison prompt is saved and reopened in the builder
- **THEN** both prompt editors are populated and saving again preserves both `prompts:` entries

#### Scenario: Cost visibility
- **WHEN** a comparison prompt is present in the builder
- **THEN** the section shows a note that every test will run twice per enabled model

### Requirement: Blind A/B winner check
The builder SHALL offer a "Blind A/B winner" check kind serialized as a promptfoo `select-best` assertion (criterion text as value). Validation SHALL reject a draft containing a select-best check without a comparison prompt, on both client and server. The builder SHALL warn (not block) when a select-best check is used with an exec-script judge, recommending an API-provider judge for reliable comparison parsing.

#### Scenario: Select-best requires two prompts
- **WHEN** a draft with a select-best check and no comparison prompt is POSTed
- **THEN** the API responds 400 naming the missing comparison prompt

#### Scenario: Exec judge warning
- **WHEN** the user adds a Blind A/B winner check while the judge is a CLI runner
- **THEN** the builder shows an inline warning recommending an API-provider judge

### Requirement: Results are variant-aware
For runs of two-prompt configs, the results view SHALL label every test result with its prompt variant (derived from the prompt file name or label), show per-variant pass counts in the stat row, and — when select-best checks are present — show a win tally (how many tests each variant won) with the judge's reason per test.

#### Scenario: Variant grouping
- **WHEN** a two-prompt run with 3 test cases and 1 model completes
- **THEN** the results page shows 6 labeled results grouped per test case (variant A and B side by side) and per-variant pass counts

#### Scenario: Win tally
- **WHEN** select-best checks are present and variant A wins 2 of 3 tests
- **THEN** the results page shows a tally of A:2 B:1 with each test's judge reason available
