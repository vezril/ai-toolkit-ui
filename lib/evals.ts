import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { REPO_ROOT } from './paths';

/**
 * The eval builder: a form-friendly draft model that serializes to a promptfoo
 * config YAML + prompt markdown file, and parses back for editing. Generated
 * configs are stamped with GENERATED_MARKER so the UI knows they're safe to
 * round-trip through the builder.
 */

export const GENERATED_MARKER = '# ai-toolkit-ui: eval-builder v1';
export const EVALS_DIR = 'evals';

export interface RunnerInfo {
  key: string;
  name: string;
  script: string;
  defaultModel: string;
  models: string[];
  available: boolean;
}

const RUNNER_CATALOG: Omit<RunnerInfo, 'available'>[] = [
  {
    key: 'devin',
    name: 'Devin',
    script: 'devin.js',
    defaultModel: 'SWE-1.6',
    models: ['SWE-1.6', 'claude-haiku-4.5', 'kimi-k2.7'],
  },
  {
    key: 'claude',
    name: 'Claude Code',
    script: 'claude.js',
    defaultModel: 'haiku',
    models: ['haiku', 'sonnet', 'opus'],
  },
  {
    key: 'gh_copilot',
    name: 'GitHub Copilot',
    script: 'gh_copilot.js',
    defaultModel: 'claude-haiku-4.5',
    models: ['claude-haiku-4.5', 'gpt-5.2'],
  },
  {
    key: 'agy',
    name: 'Google Antigravity',
    script: 'agy.js',
    defaultModel: 'gemini-3.5-flash',
    models: ['gemini-3.5-flash', 'gemini-3.5-pro'],
  },
  {
    key: 'kiro',
    name: 'Kiro',
    script: 'kiro.js',
    defaultModel: 'claude-sonnet-4.6',
    models: ['claude-sonnet-4.6'],
  },
];

export function listRunners(): RunnerInfo[] {
  return RUNNER_CATALOG.map((r) => ({
    ...r,
    available: fs.existsSync(path.join(REPO_ROOT, r.script)),
  }));
}

export type CheckDraft =
  | { kind: 'contains'; text: string; ignoreCase: boolean }
  | { kind: 'rubric'; criterion: string; metric?: string; threshold: number; weight: number };

export interface TestDraft {
  description?: string;
  request: string;
  checks: CheckDraft[];
}

export interface ModelDraft {
  runner: string; // RunnerInfo.key
  model: string;
  maxTokens?: number;
  enabled: boolean;
}

export interface EvalDraft {
  name: string;
  configPath?: string; // set when editing an existing eval
  prompt: string;
  models: ModelDraft[];
  judge: string; // RunnerInfo.key that grades AI-judge checks
  tests: TestDraft[];
}

function runnerByKey(key: string): Omit<RunnerInfo, 'available'> {
  const r = RUNNER_CATALOG.find((r) => r.key === key);
  if (!r) throw new Error(`Unknown runner: ${key}`);
  return r;
}

function runnerByScript(script: string): Omit<RunnerInfo, 'available'> | undefined {
  const base = path.basename(script);
  return RUNNER_CATALOG.find((r) => r.script === base);
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('Name must contain at least one letter or number');
  return slug;
}

export function validateDraft(draft: EvalDraft): string[] {
  const problems: string[] = [];
  if (!draft.name?.trim()) problems.push('Give the evaluation a name.');
  if (!draft.prompt?.trim()) problems.push('Write the prompt you want to evaluate.');
  if (!draft.models?.some((m) => m.enabled)) problems.push('Turn on at least one model.');
  if (!draft.tests?.length) problems.push('Add at least one test case.');
  draft.tests?.forEach((t, i) => {
    if (!t.request?.trim()) problems.push(`Test ${i + 1}: fill in the example input.`);
    if (!t.checks?.length) problems.push(`Test ${i + 1}: add at least one check.`);
    t.checks?.forEach((c, j) => {
      if (c.kind === 'contains' && !c.text?.trim())
        problems.push(`Test ${i + 1}, check ${j + 1}: fill in the text to look for.`);
      if (c.kind === 'rubric' && !c.criterion?.trim())
        problems.push(`Test ${i + 1}, check ${j + 1}: describe the criterion for the AI judge.`);
    });
  });
  const usesRubric = draft.tests?.some((t) => t.checks?.some((c) => c.kind === 'rubric'));
  if (usesRubric && !draft.judge) problems.push('Pick a judge model for the AI-judge checks.');
  return problems;
}

function checkToAssert(check: CheckDraft): Record<string, unknown> {
  if (check.kind === 'contains') {
    return { type: check.ignoreCase ? 'icontains' : 'contains', value: check.text };
  }
  const assert: Record<string, unknown> = {
    type: 'llm-rubric',
    value: check.criterion,
    threshold: check.threshold,
    weight: check.weight,
  };
  if (check.metric?.trim()) assert.metric = check.metric.trim();
  return assert;
}

function assertToCheck(a: any): CheckDraft | null {
  if (a?.type === 'contains' || a?.type === 'icontains') {
    return { kind: 'contains', text: String(a.value ?? ''), ignoreCase: a.type === 'icontains' };
  }
  if (a?.type === 'llm-rubric') {
    return {
      kind: 'rubric',
      criterion: String(a.value ?? ''),
      metric: a.metric,
      threshold: typeof a.threshold === 'number' ? a.threshold : 0.5,
      weight: typeof a.weight === 'number' ? a.weight : 1,
    };
  }
  return null;
}

/** Prompt files must contain the {{request}} placeholder; append a standard footer if missing. */
export function ensureRequestPlaceholder(prompt: string): string {
  if (prompt.includes('{{request}}')) return prompt;
  return `${prompt.trimEnd()}\n\nHere's the request:\n{{request}}\n`;
}

export interface EvalFiles {
  configPath: string; // repo-relative
  promptPath: string; // repo-relative
  configYaml: string;
  promptText: string;
}

export function draftToFiles(draft: EvalDraft): EvalFiles {
  const problems = validateDraft(draft);
  if (problems.length) throw new Error(problems.join(' '));

  const slug = draft.configPath
    ? path.basename(draft.configPath).replace(/\.config\.yaml$/, '')
    : slugify(draft.name);
  const configPath = draft.configPath ?? `${EVALS_DIR}/${slug}.config.yaml`;
  const promptPath = `${EVALS_DIR}/${slug}.prompt.md`;

  const providers = draft.models
    .filter((m) => m.enabled)
    .map((m) => {
      const runner = runnerByKey(m.runner);
      const config: Record<string, unknown> = { model: m.model || runner.defaultModel };
      if (m.maxTokens) config.maxTokens = m.maxTokens;
      return {
        id: `exec: node ./${runner.script}`,
        label: `${runner.name} (${config.model})`,
        config,
      };
    });

  const config = {
    description: draft.name,
    prompts: [`file://${slug}.prompt.md`],
    defaultTest: {
      options: { provider: `exec: node ./${runnerByKey(draft.judge).script}` },
    },
    providers,
    tests: draft.tests.map((t) => ({
      ...(t.description?.trim() ? { description: t.description.trim() } : {}),
      vars: { request: t.request },
      assert: t.checks.map(checkToAssert),
    })),
    outputPath: `${EVALS_DIR}/${slug}.results.html`,
  };

  const header = `${GENERATED_MARKER}\n# Edit this eval in the AI Toolkit UI builder, or by hand — hand edits beyond\n# this structure won't survive a round-trip through the builder.\n`;
  return {
    configPath,
    promptPath,
    configYaml: header + YAML.stringify(config),
    promptText: ensureRequestPlaceholder(draft.prompt),
  };
}

export function isGeneratedConfig(configAbsPath: string): boolean {
  try {
    return fs.readFileSync(configAbsPath, 'utf8').startsWith(GENERATED_MARKER);
  } catch {
    return false;
  }
}

export function filesToDraft(configAbsPath: string): EvalDraft {
  if (!isGeneratedConfig(configAbsPath)) {
    throw new Error('This config was not generated by the eval builder; edit its YAML instead.');
  }
  const parsed = YAML.parse(fs.readFileSync(configAbsPath, 'utf8'));
  const configDir = path.dirname(configAbsPath);

  const promptEntry: string = Array.isArray(parsed.prompts) ? parsed.prompts[0] : parsed.prompts;
  const promptAbs = path.resolve(configDir, String(promptEntry).replace(/^file:\/\//, ''));
  const prompt = fs.existsSync(promptAbs) ? fs.readFileSync(promptAbs, 'utf8') : '';

  const enabledModels: ModelDraft[] = (parsed.providers ?? [])
    .map((p: any) => {
      const script = String(p?.id ?? '').replace(/^exec:\s*node\s*/, '');
      const runner = runnerByScript(script);
      if (!runner) return null;
      return {
        runner: runner.key,
        model: p?.config?.model ?? runner.defaultModel,
        maxTokens: typeof p?.config?.maxTokens === 'number' ? p.config.maxTokens : undefined,
        enabled: true,
      };
    })
    .filter(Boolean);

  // Present the full catalog, with un-configured runners toggled off.
  const models: ModelDraft[] = RUNNER_CATALOG.map((r) => {
    const found = enabledModels.find((m: ModelDraft) => m.runner === r.key);
    return found ?? { runner: r.key, model: r.defaultModel, enabled: false };
  });

  const judgeScript = String(parsed.defaultTest?.options?.provider ?? '').replace(
    /^exec:\s*node\s*/,
    '',
  );
  const judge = runnerByScript(judgeScript)?.key ?? 'devin';

  const tests: TestDraft[] = (parsed.tests ?? [])
    .filter((t: unknown) => t && typeof t === 'object')
    .map((t: any) => ({
      description: t.description,
      request: String(t.vars?.request ?? ''),
      checks: (Array.isArray(t.assert) ? t.assert : [])
        .map(assertToCheck)
        .filter((c: CheckDraft | null): c is CheckDraft => c !== null),
    }));

  return {
    name: String(parsed.description ?? path.basename(configAbsPath)),
    configPath: path.relative(REPO_ROOT, configAbsPath),
    prompt,
    models,
    judge,
    tests,
  };
}
