import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import YAML from 'yaml';
import { getAgentsDir } from './settings';
import { versionedSave } from './versions';

/**
 * Agents library: list, read, and write agent definitions — flat `*.md` files
 * with YAML frontmatter (name, description, tools, …) in the configured
 * agents directory (fourth configured root).
 *
 * Editing stance matches skills (full fidelity): agents are hand-authored
 * files this editor joins — unknown frontmatter keys round-trip untouched.
 */

const KEBAB_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DESC_BAND_MIN = 200;
const DESC_BAND_MAX = 1500;
const CLAUDE_AGENTS_DIR = path.join(os.homedir(), '.claude', 'agents');

const KNOWN_TOOLS = new Set([
  '*', 'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Task', 'NotebookEdit',
  'WebSearch', 'WebFetch', 'TodoWrite', 'AskUserQuestion', 'SlashCommand', 'Skill',
]);

export interface AgentHealth {
  errors: string[];
  warnings: string[];
}

export type DeployStatus = 'symlinked' | 'in-sync' | 'differs' | 'missing';

export interface AgentSummary {
  name: string;
  description: string;
  tools?: string;
  health: AgentHealth;
  deploy: DeployStatus;
}

export interface AgentForm {
  name: string;
  description: string;
  body: string;
  tools?: string;
  model?: string;
}

export function isConfigured(): boolean {
  return getAgentsDir() !== null;
}

function agentsRoot(): string {
  const dir = getAgentsDir();
  if (!dir) throw new Error('No agents directory configured — set one in Settings.');
  return dir;
}

function resolveAgentFile(name: string): string {
  const root = agentsRoot();
  if (!KEBAB_NAME.test(name)) throw new Error(`Invalid agent name: ${name}`);
  const abs = path.resolve(root, `${name}.md`);
  if (!abs.startsWith(root + path.sep)) throw new Error(`Invalid agent name: ${name}`);
  return abs;
}

interface ParsedAgent {
  front: Record<string, unknown>;
  body: string;
  frontError?: string;
}

function parseAgentMd(text: string): ParsedAgent {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { front: {}, body: text, frontError: 'No YAML frontmatter block found' };
  try {
    const front = YAML.parse(m[1]);
    if (!front || typeof front !== 'object') {
      return { front: {}, body: m[2], frontError: 'Frontmatter is empty or not a mapping' };
    }
    return { front: front as Record<string, unknown>, body: m[2] };
  } catch (err) {
    return { front: {}, body: m[2], frontError: `Frontmatter does not parse: ${err}` };
  }
}

export function validateAgent(fileName: string, parsed: ParsedAgent): AgentHealth {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (parsed.frontError) errors.push(parsed.frontError);
  if (!KEBAB_NAME.test(fileName)) {
    errors.push(`Name must be kebab-case (lowercase letters, digits, hyphens): "${fileName}"`);
  }
  const frontName = String(parsed.front.name ?? '');
  if (!frontName) errors.push('Frontmatter is missing a name field');
  else if (frontName !== fileName) {
    errors.push(`Frontmatter name ("${frontName}") must equal the file name ("${fileName}")`);
  }

  const description = String(parsed.front.description ?? '').trim();
  if (!description) errors.push('Frontmatter is missing a description');
  else if (description.length < DESC_BAND_MIN || description.length > DESC_BAND_MAX) {
    warnings.push(
      `Description is ${description.length} chars — outside the recommended ${DESC_BAND_MIN}–${DESC_BAND_MAX} band; it drives delegation routing`,
    );
  }

  if (!parsed.body.trim()) errors.push('Agent body is empty');

  const tools = parsed.front.tools;
  if (tools != null) {
    const entries = String(tools)
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const unknown = entries.filter((t) => !KNOWN_TOOLS.has(t) && !t.includes('__'));
    if (unknown.length) {
      warnings.push(`Unrecognized tool name${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}`);
    }
  }

  return { errors, warnings };
}

function deployStatus(name: string, source: string): DeployStatus {
  const twin = path.join(CLAUDE_AGENTS_DIR, `${name}.md`);
  let lst: fs.Stats;
  try {
    lst = fs.lstatSync(twin);
  } catch {
    return 'missing';
  }
  if (lst.isSymbolicLink()) return 'symlinked';
  const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
  try {
    return hash(fs.readFileSync(twin, 'utf8')) === hash(source) ? 'in-sync' : 'differs';
  } catch {
    return 'differs';
  }
}

export function listAgents(): AgentSummary[] {
  const root = agentsRoot();
  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => {
      const name = f.replace(/\.md$/, '');
      const source = fs.readFileSync(path.join(root, f), 'utf8');
      const parsed = parseAgentMd(source);
      return {
        name,
        description: String(parsed.front.description ?? ''),
        tools: parsed.front.tools != null ? String(parsed.front.tools) : undefined,
        health: validateAgent(name, parsed),
        deploy: deployStatus(name, source),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function readAgent(name: string): AgentForm {
  const file = resolveAgentFile(name);
  if (!fs.existsSync(file)) throw new Error(`Agent not found: ${name}`);
  const parsed = parseAgentMd(fs.readFileSync(file, 'utf8'));
  return {
    name,
    description: String(parsed.front.description ?? ''),
    body: parsed.body,
    tools: parsed.front.tools != null ? String(parsed.front.tools) : undefined,
    model: parsed.front.model != null ? String(parsed.front.model) : undefined,
  };
}

function mergeFront(existing: Record<string, unknown>, form: AgentForm): Record<string, unknown> {
  const front: Record<string, unknown> = { ...existing };
  front.name = form.name;
  front.description = form.description.trim();
  if (form.tools?.trim()) front.tools = form.tools.trim();
  else delete front.tools;
  if (form.model?.trim()) front.model = form.model.trim();
  else delete front.model;
  return front;
}

export function writeAgent(form: AgentForm, opts: { mustExist: boolean }): AgentHealth {
  const file = resolveAgentFile(form.name);
  const exists = fs.existsSync(file);
  if (opts.mustExist && !exists) throw new Error(`Agent not found: ${form.name}`);
  if (!opts.mustExist && exists) {
    throw new Error(`An agent named "${form.name}" already exists — pick a different name.`);
  }

  const existingParsed = exists ? parseAgentMd(fs.readFileSync(file, 'utf8')) : null;
  const front = mergeFront(existingParsed?.front ?? {}, form);
  const body = form.body.replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n';

  const health = validateAgent(form.name, { front, body });
  if (health.errors.length) throw new Error(health.errors.join(' '));

  // No-op guard: a save that changes nothing semantically must not rewrite the
  // file — re-serialization would normalize hand-written YAML style (folded
  // scalars, quoting) and create pointless diffs. Compare with the same
  // normalization mergeFront applies (trimmed strings), since folded scalars
  // parse with trailing newlines.
  if (existingParsed) {
    const normalizedExisting = Object.fromEntries(
      Object.entries(existingParsed.front).map(([k, v]) => [
        k,
        typeof v === 'string' ? v.trim() : v,
      ]),
    );
    if (
      JSON.stringify(normalizedExisting) === JSON.stringify(front) &&
      existingParsed.body.replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n' === body
    ) {
      return health;
    }
  }

  const frontYaml = YAML.stringify(front, { lineWidth: 0 });
  fs.writeFileSync(file, `---\n${frontYaml}---\n\n${body}`, 'utf8');

  versionedSave(
    agentsRoot(),
    'agent',
    form.name,
    [`${form.name}.md`],
    opts.mustExist ? 'edited' : 'created',
  );
  return health;
}
