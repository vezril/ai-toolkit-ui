## ADDED Requirements

### Requirement: A/B eval creation from a skill
The skill editor SHALL offer a "Create A/B eval" action alongside the standard create action. It SHALL generate a two-prompt eval: the with-skill prompt (identical to the standard generation) and a baseline prompt using the same template with the skill block omitted, plus a seeded Blind A/B winner check whose criterion references the skill's guidance, in addition to the standard seeded rubric check. Skill sync SHALL continue to regenerate only the with-skill prompt file; the baseline prompt and the config SHALL NOT be modified by sync.

#### Scenario: A/B generation
- **WHEN** the user clicks "Create A/B eval" on the skill `tdd`
- **THEN** `evals/skill-tdd.prompt.md` (with skill), `evals/skill-tdd.baseline.prompt.md` (no skill block), and a config listing both prompts with a seeded select-best check exist, and the browser lands in the eval builder

#### Scenario: Sync ignores the baseline arm
- **WHEN** the tdd skill is edited and "Sync skill → eval" is invoked on an A/B eval
- **THEN** the with-skill prompt file is regenerated and both the baseline prompt file and the config are byte-identical to before
