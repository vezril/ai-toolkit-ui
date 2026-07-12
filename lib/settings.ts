import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * App-level settings: provider API keys stored OUTSIDE any git repository in
 * ~/.ai-toolkit-ui/settings.json (0600). Full keys never leave this module
 * except as spawn-time env vars (settingsEnv) — reads for the UI are masked.
 */

export interface ApiProviderInfo {
  key: string; // catalog key, doubles as the promptfoo provider id prefix
  label: string;
  envVar: string;
  models: string[];
}

export const API_PROVIDERS: ApiProviderInfo[] = [
  {
    key: 'anthropic',
    label: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    models: ['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-4-8'],
  },
  {
    key: 'openai',
    label: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    models: ['gpt-5.2', 'gpt-5.2-mini'],
  },
  {
    key: 'google',
    label: 'Google',
    envVar: 'GOOGLE_API_KEY',
    models: ['gemini-3.5-pro', 'gemini-3.5-flash'],
  },
];

export function apiProviderByKey(key: string): ApiProviderInfo | undefined {
  return API_PROVIDERS.find((p) => p.key === key);
}

const SETTINGS_DIR = path.join(os.homedir(), '.ai-toolkit-ui');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

interface StoredKey {
  key: string;
  setAt: string; // ISO timestamp
}

export interface RunGuardrails {
  maxConcurrentRuns: number; // integer ≥ 1
  runTimeoutMinutes: number; // ≥ 0; 0 disables the timeout
}

export const DEFAULT_RUN_GUARDRAILS: RunGuardrails = {
  maxConcurrentRuns: 2,
  runTimeoutMinutes: 15,
};

interface Settings {
  apiKeys: Record<string, StoredKey>;
  skillsDir?: string;
  workflowsDir?: string;
  agentsDir?: string;
  ollamaBaseUrl?: string;
  runGuardrails?: Partial<RunGuardrails>;
}

function readSettings(): Settings {
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    return {
      apiKeys: parsed?.apiKeys ?? {},
      skillsDir: typeof parsed?.skillsDir === 'string' ? parsed.skillsDir : undefined,
      workflowsDir: typeof parsed?.workflowsDir === 'string' ? parsed.workflowsDir : undefined,
      agentsDir: typeof parsed?.agentsDir === 'string' ? parsed.agentsDir : undefined,
      ollamaBaseUrl: typeof parsed?.ollamaBaseUrl === 'string' ? parsed.ollamaBaseUrl : undefined,
      runGuardrails:
        parsed?.runGuardrails && typeof parsed.runGuardrails === 'object'
          ? parsed.runGuardrails
          : undefined,
    };
  } catch {
    return { apiKeys: {} };
  }
}

function writeSettings(settings: Settings): void {
  fs.mkdirSync(SETTINGS_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), { mode: 0o600 });
  // writeFileSync's mode only applies on create; enforce on every rewrite.
  fs.chmodSync(SETTINGS_FILE, 0o600);
}

export function setApiKey(provider: string, key: string): void {
  if (!apiProviderByKey(provider)) throw new Error(`Unknown API provider: ${provider}`);
  const trimmed = key.trim();
  if (!trimmed) throw new Error('API key must not be empty');
  const settings = readSettings();
  settings.apiKeys[provider] = { key: trimmed, setAt: new Date().toISOString() };
  writeSettings(settings);
}

export function deleteApiKey(provider: string): void {
  const settings = readSettings();
  delete settings.apiKeys[provider];
  writeSettings(settings);
}

export function hasApiKey(provider: string): boolean {
  return Boolean(readSettings().apiKeys[provider]?.key);
}

export interface MaskedKey {
  provider: string;
  last4: string;
  setAt: string;
}

/** Masked view for the UI — full key material never leaves the server. */
export function maskedKeys(): MaskedKey[] {
  const settings = readSettings();
  return Object.entries(settings.apiKeys).map(([provider, stored]) => ({
    provider,
    last4: stored.key.slice(-4),
    setAt: stored.setAt,
  }));
}

/** Absolute path of the configured skills directory: stored ?? SKILLS_DIR env ?? null. */
export function getSkillsDir(): string | null {
  return readSettings().skillsDir ?? process.env.SKILLS_DIR ?? null;
}

/** Set (or clear, with '') the skills directory. Must be an absolute path to an existing directory. */
export function setSkillsDir(dir: string): void {
  const settings = readSettings();
  const trimmed = dir.trim();
  if (!trimmed) {
    delete settings.skillsDir;
    writeSettings(settings);
    return;
  }
  if (!path.isAbsolute(trimmed)) throw new Error('Skills directory must be an absolute path');
  let stat: fs.Stats;
  try {
    stat = fs.statSync(trimmed);
  } catch {
    throw new Error(`Directory does not exist: ${trimmed}`);
  }
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${trimmed}`);
  settings.skillsDir = trimmed;
  writeSettings(settings);
}

/** Absolute path of the configured workflows directory: stored ?? WORKFLOWS_DIR env ?? null. */
export function getWorkflowsDir(): string | null {
  return readSettings().workflowsDir ?? process.env.WORKFLOWS_DIR ?? null;
}

/** Set (or clear, with '') the workflows directory. Must be an absolute path to an existing directory. */
export function setWorkflowsDir(dir: string): void {
  const settings = readSettings();
  const trimmed = dir.trim();
  if (!trimmed) {
    delete settings.workflowsDir;
    writeSettings(settings);
    return;
  }
  if (!path.isAbsolute(trimmed)) throw new Error('Workflows directory must be an absolute path');
  let stat: fs.Stats;
  try {
    stat = fs.statSync(trimmed);
  } catch {
    throw new Error(`Directory does not exist: ${trimmed}`);
  }
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${trimmed}`);
  settings.workflowsDir = trimmed;
  writeSettings(settings);
}

/** Absolute path of the configured agents directory: stored ?? AGENTS_DIR env ?? null. */
export function getAgentsDir(): string | null {
  return readSettings().agentsDir ?? process.env.AGENTS_DIR ?? null;
}

/** Set (or clear, with '') the agents directory. Must be an absolute path to an existing directory. */
export function setAgentsDir(dir: string): void {
  const settings = readSettings();
  const trimmed = dir.trim();
  if (!trimmed) {
    delete settings.agentsDir;
    writeSettings(settings);
    return;
  }
  if (!path.isAbsolute(trimmed)) throw new Error('Agents directory must be an absolute path');
  let stat: fs.Stats;
  try {
    stat = fs.statSync(trimmed);
  } catch {
    throw new Error(`Directory does not exist: ${trimmed}`);
  }
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${trimmed}`);
  settings.agentsDir = trimmed;
  writeSettings(settings);
}

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

/** Configured Ollama base URL: stored ?? OLLAMA_BASE_URL env ?? localhost:11434. */
export function getOllamaBaseUrl(): string {
  return readSettings().ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL;
}

/** Is a non-default base URL in effect (i.e. runs need OLLAMA_BASE_URL injected)? */
export function ollamaBaseUrlIsCustom(): boolean {
  return getOllamaBaseUrl() !== DEFAULT_OLLAMA_BASE_URL;
}

/** Set (or clear, with '' → default) the Ollama base URL. */
export function setOllamaBaseUrl(url: string): void {
  const settings = readSettings();
  const trimmed = url.trim();
  if (!trimmed || trimmed === DEFAULT_OLLAMA_BASE_URL) {
    delete settings.ollamaBaseUrl;
    writeSettings(settings);
    return;
  }
  if (!/^https?:\/\//.test(trimmed)) throw new Error('Ollama base URL must start with http:// or https://');
  settings.ollamaBaseUrl = trimmed.replace(/\/$/, '');
  writeSettings(settings);
}

/** Effective guardrails: stored values over defaults. Read at each run start. */
export function getRunGuardrails(): RunGuardrails {
  const stored = readSettings().runGuardrails;
  return {
    maxConcurrentRuns:
      typeof stored?.maxConcurrentRuns === 'number'
        ? stored.maxConcurrentRuns
        : DEFAULT_RUN_GUARDRAILS.maxConcurrentRuns,
    runTimeoutMinutes:
      typeof stored?.runTimeoutMinutes === 'number'
        ? stored.runTimeoutMinutes
        : DEFAULT_RUN_GUARDRAILS.runTimeoutMinutes,
  };
}

export function setRunGuardrails(g: Partial<RunGuardrails>): void {
  if (g.maxConcurrentRuns !== undefined) {
    if (!Number.isInteger(g.maxConcurrentRuns) || g.maxConcurrentRuns < 1) {
      throw new Error('Max concurrent runs must be a whole number of at least 1');
    }
  }
  if (g.runTimeoutMinutes !== undefined) {
    if (typeof g.runTimeoutMinutes !== 'number' || !isFinite(g.runTimeoutMinutes) || g.runTimeoutMinutes < 0) {
      throw new Error('Run timeout must be 0 (disabled) or a positive number of minutes');
    }
  }
  const settings = readSettings();
  settings.runGuardrails = { ...getRunGuardrails(), ...g };
  writeSettings(settings);
}

/** Env-var map injected into spawned promptfoo runs (and nowhere else). */
export function settingsEnv(): Record<string, string> {
  const settings = readSettings();
  const env: Record<string, string> = {};
  for (const p of API_PROVIDERS) {
    const stored = settings.apiKeys[p.key];
    if (stored?.key) env[p.envVar] = stored.key;
  }
  return env;
}
