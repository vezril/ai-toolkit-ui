/**
 * Eval coach: static structural heuristics over an eval's tests and checks.
 * Advisory-only — the coach never blocks saving or running (that's the
 * validator's job). Pure and dependency-free so the builder can run it
 * client-side on live drafts and /api/configs can run it server-side on
 * parsed configs, from one catalog.
 */

export interface Finding {
  message: string;
  principle: string;
}

export type CoachCheckKind = 'contains' | 'not-contains' | 'rubric' | 'ab-winner' | 'other';

export interface CoachCheck {
  kind: CoachCheckKind;
  criterion?: string;
  threshold?: number; // rubric only; undefined = promptfoo default (0.5)
  weight?: number; // rubric only; undefined = 1
}

export interface CoachTest {
  request: string;
  checks: CoachCheck[];
}

/** The seed text skill-eval generation plants — shared so the heuristic can't drift. */
export const SEED_PLACEHOLDER = '(replace with a realistic request this skill should handle)';

const NON_OBSERVABLE = /\b(?:is|are|be|seems?|looks?)\s+(?:good|great|nice|clear|helpful|correct|well[- ]?written|high[- ]?quality)\b/i;

export function coachFindings(tests: CoachTest[]): Finding[] {
  const findings: Finding[] = [];
  const allChecks = tests.flatMap((t) => t.checks);
  const rubrics = allChecks.filter((c) => c.kind === 'rubric');

  if (tests.length === 1) {
    findings.push({
      message: 'Only one test case — one input can’t distinguish prompt quality from luck.',
      principle: 'Evidence variety: cover an easy, a hard, and an ambiguous input.',
    });
  }

  if (allChecks.length > 0 && !allChecks.some((c) => c.kind === 'not-contains')) {
    findings.push({
      message: 'No failure-mode check — nothing asserts what must NOT appear.',
      principle: 'Counter-metrics: pair every success criterion with a failure guard.',
    });
  }

  if (
    allChecks.length > 0 &&
    allChecks.every((c) => c.kind === 'rubric' || c.kind === 'ab-winner')
  ) {
    findings.push({
      message: 'Every check needs a judge — no deterministic checks at all.',
      principle: 'Model economics: cheap contains/not-contains checks catch regressions for free.',
    });
  }

  if (rubrics.length > 0 && rubrics.every((c) => (c.threshold ?? 0.5) === 0.5)) {
    findings.push({
      message: 'All rubric thresholds sit at the 0.5 default — never calibrated.',
      principle: 'Load-bearing calibration: core criteria warrant 0.7–0.8, nice-to-haves 0.4–0.5.',
    });
  }

  if (rubrics.length > 1 && new Set(rubrics.map((c) => c.weight ?? 1)).size === 1) {
    findings.push({
      message: 'All rubric weights are equal — nothing is marked load-bearing.',
      principle: 'Load-bearing calibration: critical dimensions should outweigh nice-to-haves.',
    });
  }

  const vague = rubrics.find((c) => c.criterion && NON_OBSERVABLE.test(c.criterion));
  if (vague) {
    findings.push({
      message: `Rubric criterion isn’t observable: “${vague.criterion!.slice(0, 60)}”.`,
      principle: 'Observable statements: “includes a working code example” beats “is good”.',
    });
  }

  if (tests.some((t) => t.request.includes(SEED_PLACEHOLDER))) {
    findings.push({
      message: 'A test still uses the seeded placeholder input.',
      principle: 'Evidence must be realistic: replace the placeholder with a request the prompt will actually face.',
    });
  }

  return findings;
}
