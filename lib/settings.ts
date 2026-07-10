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

interface Settings {
  apiKeys: Record<string, StoredKey>;
}

function readSettings(): Settings {
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    return { apiKeys: parsed?.apiKeys ?? {} };
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
