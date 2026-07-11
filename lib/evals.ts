import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { REPO_ROOT } from './paths';
import { API_PROVIDERS, apiProviderByKey, hasApiKey } from './settings';

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

export interface ApiProviderOption {
  key: string;
  label: string;
  models: string[];
  keyConfigured: boolean;
}

/** Direct API providers offered in the builder, gated on a stored key. */
export function listApiProviders(): ApiProviderOption[] {
  return API_PROVIDERS.map((p) => ({
    key: p.key,
    label: p.label,
    models: p.models,
    keyConfigured: hasApiKey(p.key),
  }));
}

const API_PROVIDER_ID = new RegExp(`^(${API_PROVIDERS.map((p) => p.key).join('|')}):(.+)$`);

export type CheckDraft =
  | { kind: 'contains'; text: string; ignoreCase: boolean }
  | { kind: 'rubric'; criterion: string; metric?: string; threshold: number; weight: number }
  // Blind A/B winner: the judge compares all prompt variants' outputs for the
  // test (unlabeled) and picks the one best satisfying the criterion.
  | { kind: 'ab-winner'; criterion: string };

export interface TestDraft {
  description?: string;
  request: string;
  checks: CheckDraft[];
}

export interface ModelDraft {
  runner: string; // RunnerInfo.key (kind 'cli') or ApiProviderInfo.key (kind 'api')
  kind?: 'cli' | 'api'; // absent means 'cli' (pre-0.3.0 drafts)
  model: string;
  maxTokens?: number;
  enabled: boolean;
}

export interface EvalDraft {
  name: string;
  configPath?: string; // set when editing an existing eval
  prompt: string;
  promptB?: string; // optional comparison prompt — every test runs against both
  promptBPath?: string; // repo-relative; preserved on round-trip (default <slug>.b.prompt.md)
  models: ModelDraft[];
  judge: string; // CLI runner key or API provider key that grades AI-judge checks
  tests: TestDraft[];
}

function modelKind(m: ModelDraft): 'cli' | 'api' {
  return m.kind ?? 'cli';
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
  for (const m of draft.models ?? []) {
    if (m.enabled && modelKind(m) === 'api' && !hasApiKey(m.runner)) {
      const label = apiProviderByKey(m.runner)?.label ?? m.runner;
      problems.push(`No ${label} API key is configured — add one in Settings first.`);
    }
  }
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
  const usesAbWinner = draft.tests?.some((t) => t.checks?.some((c) => c.kind === 'ab-winner'));
  if (usesAbWinner && !draft.promptB?.trim()) {
    problems.push('Blind A/B winner checks need a comparison prompt (B) to compare against.');
  }
  const usesRubric = draft.tests?.some((t) =>
    t.checks?.some((c) => c.kind === 'rubric' || c.kind === 'ab-winner'),
  );
  if (usesRubric && !draft.judge) problems.push('Pick a judge model for the AI-judge checks.');
  if (usesRubric && draft.judge && apiProviderByKey(draft.judge) && !hasApiKey(draft.judge)) {
    const label = apiProviderByKey(draft.judge)!.label;
    problems.push(`The judge needs a ${label} API key — add one in Settings first.`);
  }
  return problems;
}

function checkToAssert(check: CheckDraft): Record<string, unknown> {
  if (check.kind === 'contains') {
    return { type: check.ignoreCase ? 'icontains' : 'contains', value: check.text };
  }
  if (check.kind === 'ab-winner') {
    return { type: 'select-best', value: check.criterion };
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
  if (a?.type === 'select-best') {
    return { kind: 'ab-winner', criterion: String(a.value ?? '') };
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
  promptBPath?: string; // repo-relative, present when the draft has a comparison prompt
  promptBText?: string;
}

export function draftToFiles(draft: EvalDraft): EvalFiles {
  const problems = validateDraft(draft);
  if (problems.length) throw new Error(problems.join(' '));

  const slug = draft.configPath
    ? path.basename(draft.configPath).replace(/\.config\.yaml$/, '')
    : slugify(draft.name);
  const configPath = draft.configPath ?? `${EVALS_DIR}/${slug}.config.yaml`;
  const promptPath = `${EVALS_DIR}/${slug}.prompt.md`;
  const hasPromptB = Boolean(draft.promptB?.trim());
  const promptBPath = hasPromptB
    ? (draft.promptBPath ?? `${EVALS_DIR}/${slug}.b.prompt.md`)
    : undefined;

  const providers = draft.models
    .filter((m) => m.enabled)
    .map((m) => {
      if (modelKind(m) === 'api') {
        const api = apiProviderByKey(m.runner);
        if (!api) throw new Error(`Unknown API provider: ${m.runner}`);
        const model = m.model || api.models[0];
        const entry: Record<string, unknown> = {
          id: `${api.key}:${model}`,
          label: `${api.label} (${model})`,
        };
        // promptfoo API providers use max_tokens; keys come from env, never YAML.
        if (m.maxTokens) entry.config = { max_tokens: m.maxTokens };
        return entry;
      }
      const runner = runnerByKey(m.runner);
      const config: Record<string, unknown> = { model: m.model || runner.defaultModel };
      if (m.maxTokens) config.maxTokens = m.maxTokens;
      return {
        // promptfoo resolves exec paths relative to the CONFIG's directory
        // (basePath), not the project root — generated configs live in
        // evals/, so runner scripts at the root need the ../ prefix.
        id: `exec: node ../${runner.script}`,
        label: `${runner.name} (${config.model})`,
        config,
      };
    });

  // The judge is either a CLI runner (exec script) or an API provider. An API
  // judge uses the model from its enabled card, falling back to the provider's
  // first suggested model.
  const apiJudge = apiProviderByKey(draft.judge);
  const judgeProvider = apiJudge
    ? `${apiJudge.key}:${
        draft.models.find((m) => modelKind(m) === 'api' && m.runner === apiJudge.key && m.enabled)
          ?.model || apiJudge.models[0]
      }`
    : `exec: node ../${runnerByKey(draft.judge).script}`;

  const config = {
    description: draft.name,
    prompts: [
      `file://${slug}.prompt.md`,
      ...(promptBPath ? [`file://${path.basename(promptBPath)}`] : []),
    ],
    defaultTest: {
      options: { provider: judgeProvider },
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
    ...(hasPromptB && promptBPath
      ? { promptBPath, promptBText: ensureRequestPlaceholder(draft.promptB!) }
      : {}),
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

  const promptEntries: string[] = Array.isArray(parsed.prompts)
    ? parsed.prompts
    : [parsed.prompts];
  if (promptEntries.length > 2) {
    throw new Error(
      'This config has more than two prompts — the builder edits at most an A/B pair; use the raw YAML editor instead.',
    );
  }
  const readPromptEntry = (entry: unknown) => {
    const abs = path.resolve(configDir, String(entry).replace(/^file:\/\//, ''));
    return {
      text: fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '',
      rel: path.relative(REPO_ROOT, abs),
    };
  };
  const prompt = readPromptEntry(promptEntries[0]).text;
  const promptBEntry = promptEntries[1] ? readPromptEntry(promptEntries[1]) : undefined;

  const enabledModels: ModelDraft[] = (parsed.providers ?? [])
    .map((p: any): ModelDraft | null => {
      const id = String(p?.id ?? '');
      const apiMatch = id.match(API_PROVIDER_ID);
      if (apiMatch) {
        return {
          runner: apiMatch[1],
          kind: 'api',
          model: apiMatch[2],
          maxTokens: typeof p?.config?.max_tokens === 'number' ? p.config.max_tokens : undefined,
          enabled: true,
        };
      }
      const script = id.replace(/^exec:\s*node\s*/, '');
      const runner = runnerByScript(script);
      if (!runner) return null;
      return {
        runner: runner.key,
        kind: 'cli',
        model: p?.config?.model ?? runner.defaultModel,
        maxTokens: typeof p?.config?.maxTokens === 'number' ? p.config.maxTokens : undefined,
        enabled: true,
      };
    })
    .filter((m: ModelDraft | null): m is ModelDraft => m !== null);

  // Present the full catalog (CLI runners + API providers), un-configured entries toggled off.
  const models: ModelDraft[] = [
    ...RUNNER_CATALOG.map((r): ModelDraft => {
      const found = enabledModels.find((m) => modelKind(m) === 'cli' && m.runner === r.key);
      return found ?? { runner: r.key, kind: 'cli', model: r.defaultModel, enabled: false };
    }),
    ...API_PROVIDERS.map((p): ModelDraft => {
      const found = enabledModels.find((m) => modelKind(m) === 'api' && m.runner === p.key);
      return found ?? { runner: p.key, kind: 'api', model: p.models[0], enabled: false };
    }),
  ];

  const judgeRaw = String(parsed.defaultTest?.options?.provider ?? '');
  const judgeApiMatch = judgeRaw.match(API_PROVIDER_ID);
  const judge = judgeApiMatch
    ? judgeApiMatch[1]
    : (runnerByScript(judgeRaw.replace(/^exec:\s*node\s*/, ''))?.key ?? 'devin');

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
    ...(promptBEntry ? { promptB: promptBEntry.text, promptBPath: promptBEntry.rel } : {}),
    models,
    judge,
    tests,
  };
}
