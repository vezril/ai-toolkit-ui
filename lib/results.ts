import fs from 'fs';

export interface AssertionResult {
  type: string;
  metric?: string;
  criterion?: string;
  pass: boolean;
  score: number | null;
  reason?: string;
}

export interface TestResult {
  description?: string;
  provider?: string;
  vars: Record<string, unknown>;
  success: boolean;
  score: number | null;
  error?: string;
  output?: string;
  assertions: AssertionResult[];
}

export interface NormalizedResults {
  timestamp?: string;
  stats: { total: number; passed: number; failed: number };
  results: TestResult[];
}

/**
 * Normalize a promptfoo `--output foo.json` file into a shape the UI renders.
 * Written defensively: promptfoo's output schema shifts between versions.
 */
export function loadResults(outputFile: string): NormalizedResults | null {
  if (!fs.existsSync(outputFile)) return null;
  let body: any;
  try {
    body = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  } catch {
    return null;
  }

  const rows: any[] = Array.isArray(body?.results?.results)
    ? body.results.results
    : Array.isArray(body?.results)
      ? body.results
      : [];

  const results: TestResult[] = rows.map((r) => {
    const components: any[] = Array.isArray(r?.gradingResult?.componentResults)
      ? r.gradingResult.componentResults
      : [];
    const assertions: AssertionResult[] = components.map((c) => ({
      type: String(c?.assertion?.type ?? 'unknown'),
      metric: c?.assertion?.metric,
      criterion: typeof c?.assertion?.value === 'string' ? c.assertion.value : undefined,
      pass: Boolean(c?.pass),
      score: typeof c?.score === 'number' ? c.score : null,
      reason: c?.reason,
    }));

    const rawOutput = r?.response?.output ?? r?.output;
    return {
      description: r?.testCase?.description ?? r?.description,
      provider: r?.provider?.label ?? r?.provider?.id ?? undefined,
      vars: r?.vars ?? r?.testCase?.vars ?? {},
      success: Boolean(r?.success),
      score: typeof r?.score === 'number' ? r.score : null,
      error: r?.error ?? undefined,
      output:
        typeof rawOutput === 'string'
          ? rawOutput
          : rawOutput != null
            ? JSON.stringify(rawOutput, null, 2)
            : undefined,
      assertions,
    };
  });

  const passed = results.filter((r) => r.success).length;
  return {
    timestamp: body?.results?.timestamp,
    stats: { total: results.length, passed, failed: results.length - passed },
    results,
  };
}
