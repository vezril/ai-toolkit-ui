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
  testIdx?: number;
  promptIdx?: number;
  promptLabel?: string;
  wonAb?: boolean; // this variant won the test's blind A/B comparison
}

export interface VariantStats {
  label: string;
  passed: number;
  failed: number;
  wins: number; // blind A/B wins (0 when no select-best checks ran)
}

export interface NormalizedResults {
  timestamp?: string;
  stats: { total: number; passed: number; failed: number };
  variants?: VariantStats[]; // present when the run had 2+ prompt variants
  results: TestResult[];
}

/** Human label for a prompt variant: prompt-file basename when derivable, else A/B/P<n>. */
function variantLabel(row: any, promptIdx: number | undefined): string {
  const raw = row?.prompt?.label;
  if (typeof raw === 'string' && !raw.includes('\n') && raw.length <= 160) {
    const base = raw.split(/[\\/]/).pop() ?? raw;
    if (base.endsWith('.md')) return base;
  }
  if (promptIdx === undefined) return 'A';
  return promptIdx < 26 ? String.fromCharCode(65 + promptIdx) : `P${promptIdx + 1}`;
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

    const promptIdx = typeof r?.promptIdx === 'number' ? r.promptIdx : undefined;
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
      testIdx: typeof r?.testIdx === 'number' ? r.testIdx : undefined,
      promptIdx,
      promptLabel: variantLabel(r, promptIdx),
      wonAb: assertions.some((a) => a.type === 'select-best' && a.pass) || undefined,
    };
  });

  // Variant stats when 2+ prompt variants ran (defensive: absent promptIdx → single-variant).
  const promptIdxs = [...new Set(results.map((r) => r.promptIdx).filter((i) => i !== undefined))];
  let variants: VariantStats[] | undefined;
  if (promptIdxs.length > 1) {
    variants = promptIdxs
      .sort((a, b) => a! - b!)
      .map((idx) => {
        const rows = results.filter((r) => r.promptIdx === idx);
        return {
          label: rows[0]?.promptLabel ?? String(idx),
          passed: rows.filter((r) => r.success).length,
          failed: rows.filter((r) => !r.success).length,
          wins: rows.filter((r) => r.wonAb).length,
        };
      });
  }

  const passed = results.filter((r) => r.success).length;
  return {
    timestamp: body?.results?.timestamp,
    stats: { total: results.length, passed, failed: results.length - passed },
    variants,
    results,
  };
}
