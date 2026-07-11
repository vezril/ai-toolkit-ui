import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { coachFindings, type CoachCheckKind, type Finding } from './coach';
import { GENERATED_MARKER } from './evals';
import { REPO_ROOT } from './paths';

export interface AssertSummary {
  type: string;
  metric?: string;
  value?: string;
  threshold?: number;
  weight?: number;
}

export interface TestSummary {
  description?: string;
  source: string; // config file or suite file the test came from (repo-relative)
  vars?: Record<string, unknown>;
  asserts: AssertSummary[];
}

export interface ProviderSummary {
  id: string;
  label?: string;
  model?: string;
}

export interface ConfigSummary {
  path: string; // repo-relative
  description: string;
  promptFiles: string[]; // repo-relative paths to prompt files
  providers: ProviderSummary[];
  grader?: string;
  tests: TestSummary[];
  suiteFiles: string[];
  outputPath?: string;
  generated: boolean; // created by the eval builder → editable as a form
  coach: Finding[]; // advisory structure findings (never blocking)
  error?: string;
}

const ASSERT_KIND: Record<string, CoachCheckKind> = {
  contains: 'contains',
  icontains: 'contains',
  'not-contains': 'not-contains',
  'not-icontains': 'not-contains',
  'llm-rubric': 'rubric',
  'select-best': 'ab-winner',
};

function coachInput(tests: TestSummary[]) {
  return tests.map((t) => ({
    request: String(t.vars?.request ?? ''),
    checks: t.asserts.map((a) => ({
      kind: ASSERT_KIND[a.type] ?? ('other' as const),
      criterion: a.value,
      threshold: a.threshold,
      weight: a.weight,
    })),
  }));
}

const SCAN_SKIP = new Set(['node_modules', '.git', 'webui', 'eval-runs', 'docs']);
const MAX_SCAN_DEPTH = 2;

function findYamlFiles(dir: string, depth = 0): string[] {
  if (depth > MAX_SCAN_DEPTH) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SCAN_SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findYamlFiles(full, depth + 1));
    } else if (/\.ya?ml$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** "@prompt-under-test.md {{request}}" or "file://trust-ai/simple.prompt.md" -> file path */
function extractPromptFile(entry: unknown, configDir: string): string | null {
  if (typeof entry !== 'string') return null;
  let candidate: string | null = null;
  if (entry.startsWith('file://')) {
    candidate = entry.slice('file://'.length);
  } else if (entry.startsWith('@')) {
    candidate = entry.slice(1).split(/\s/)[0];
  }
  if (!candidate) return null;
  const abs = path.resolve(configDir, candidate);
  return fs.existsSync(abs) ? path.relative(REPO_ROOT, abs) : null;
}

function summarizeAsserts(asserts: unknown): AssertSummary[] {
  if (!Array.isArray(asserts)) return [];
  return asserts.map((a: any) => ({
    type: String(a?.type ?? 'unknown'),
    metric: a?.metric,
    value: typeof a?.value === 'string' ? a.value : undefined,
    threshold: typeof a?.threshold === 'number' ? a.threshold : undefined,
    weight: typeof a?.weight === 'number' ? a.weight : undefined,
  }));
}

function collectTests(
  entries: unknown,
  configDir: string,
  sourceRel: string,
  suiteFiles: string[],
): TestSummary[] {
  if (!Array.isArray(entries)) return [];
  const tests: TestSummary[] = [];
  for (const entry of entries) {
    if (typeof entry === 'string' && entry.startsWith('file://')) {
      const abs = path.resolve(configDir, entry.slice('file://'.length));
      const rel = path.relative(REPO_ROOT, abs);
      suiteFiles.push(rel);
      try {
        const suite = YAML.parse(fs.readFileSync(abs, 'utf8'));
        tests.push(...collectTests(suite, path.dirname(abs), rel, suiteFiles));
      } catch {
        tests.push({ description: `(failed to load suite ${rel})`, source: rel, asserts: [] });
      }
    } else if (entry && typeof entry === 'object') {
      const t = entry as any;
      tests.push({
        description: t.description,
        source: sourceRel,
        vars: t.vars,
        asserts: summarizeAsserts(t.assert),
      });
    }
  }
  return tests;
}

function summarizeConfig(absPath: string): ConfigSummary | null {
  const rel = path.relative(REPO_ROOT, absPath);
  let parsed: any;
  let raw: string;
  try {
    raw = fs.readFileSync(absPath, 'utf8');
    parsed = YAML.parse(raw);
  } catch (err) {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  // A promptfoo eval config has prompts + tests; test-suite files are bare arrays.
  if (!parsed.prompts || !parsed.tests) return null;

  const configDir = path.dirname(absPath);
  const promptFiles = (Array.isArray(parsed.prompts) ? parsed.prompts : [parsed.prompts])
    .map((p: unknown) => extractPromptFile(p, configDir))
    .filter((p: string | null): p is string => p !== null);

  const providers: ProviderSummary[] = (Array.isArray(parsed.providers) ? parsed.providers : [])
    .map((p: any) =>
      typeof p === 'string'
        ? { id: p }
        : { id: String(p?.id ?? 'unknown'), label: p?.label, model: p?.config?.model },
    );

  const suiteFiles: string[] = [];
  const tests = collectTests(parsed.tests, configDir, rel, suiteFiles);

  return {
    path: rel,
    description: String(parsed.description ?? rel),
    promptFiles,
    providers,
    grader: parsed.defaultTest?.options?.provider,
    tests,
    suiteFiles,
    outputPath: parsed.outputPath,
    generated: raw.startsWith(GENERATED_MARKER),
    coach: coachFindings(coachInput(tests)),
  };
}

export function listConfigs(): ConfigSummary[] {
  return findYamlFiles(REPO_ROOT)
    .map(summarizeConfig)
    .filter((c): c is ConfigSummary => c !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}
