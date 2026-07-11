import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getWorkflowsDir } from './settings';
import { readSkill } from './skills';

/**
 * Workflows library: list, visualize, and (for builder-generated files)
 * round-trip Claude Code Workflow-tool scripts.
 *
 * Bounded-fidelity contract (third application of the ADR-0004 stance):
 * hand-written scripts are VIEW-ONLY — we render their author-declared
 * meta.phases and regex-detected composition edges, never edit them.
 * Generated scripts carry the declarative step model as an embedded
 * `builderModel` literal, which is the round-trip source of truth; their
 * executable body is regenerated from it on every save.
 *
 * Trust note: listing evaluates each file's SLICED meta/builderModel object
 * literal via the Function constructor. These are the user's own local
 * scripts, which they already execute wholesale via the Workflow tool —
 * evaluating a literal from them adds no new trust (PRD A2). Bodies are
 * never evaluated here.
 */

export const WORKFLOW_MARKER = '// ai-toolkit-ui: workflow-builder v1';
const CLAUDE_WORKFLOWS_DIR = path.join(os.homedir(), '.claude', 'workflows');
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface WorkflowStep {
  title: string;
  instructions: string;
  skill?: string; // skill name from the skills directory (or free text)
}

export interface WorkflowModel {
  name: string;
  description: string;
  whenToUse?: string;
  steps: WorkflowStep[];
}

export interface WorkflowPhase {
  title: string;
  detail?: string;
}

export type SyncStatus = 'in-sync' | 'differs' | 'missing';

export interface WorkflowSummary {
  name: string; // file basename without .js
  description?: string;
  whenToUse?: string;
  phases: WorkflowPhase[];
  generated: boolean;
  metaError?: string;
  compositions: string[]; // workflow names this one calls
  sync: SyncStatus;
}

export interface WorkflowDetail extends WorkflowSummary {
  model?: WorkflowModel; // present for generated workflows
}

function workflowsRoot(): string {
  const dir = getWorkflowsDir();
  if (!dir) throw new Error('No workflows directory configured — set one in Settings.');
  return dir;
}

function resolveWorkflowFile(name: string): string {
  const root = workflowsRoot();
  if (!NAME_RE.test(name)) throw new Error(`Invalid workflow name: ${name}`);
  const abs = path.resolve(root, `${name}.js`);
  if (!abs.startsWith(root + path.sep)) throw new Error(`Invalid workflow name: ${name}`);
  return abs;
}

/** Slice a balanced {...} literal starting at the first { after `marker`. */
function sliceObjectLiteral(source: string, marker: string): string | null {
  const at = source.indexOf(marker);
  if (at < 0) return null;
  const start = source.indexOf('{', at);
  if (start < 0) return null;
  let depth = 0;
  let inString: string | null = null;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') inString = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function evalLiteral<T>(literal: string): T {
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict"; return (${literal});`)() as T;
}

function extractMeta(source: string): { meta?: any; error?: string } {
  const literal = sliceObjectLiteral(source, 'export const meta');
  if (!literal) return { error: 'No export const meta block found' };
  try {
    return { meta: evalLiteral(literal) };
  } catch (err) {
    return { error: `meta does not evaluate: ${err}` };
  }
}

function extractModel(source: string): WorkflowModel | undefined {
  const literal = sliceObjectLiteral(source, 'export const builderModel');
  if (!literal) return undefined;
  try {
    return evalLiteral<WorkflowModel>(literal);
  } catch {
    return undefined;
  }
}

function detectCompositions(source: string): string[] {
  const names = new Set<string>();
  for (const m of source.matchAll(/workflow\(\s*['"]([\w-]+)['"]/g)) names.add(m[1]);
  return [...names];
}

function syncStatus(name: string, source: string): SyncStatus {
  const twin = path.join(CLAUDE_WORKFLOWS_DIR, `${name}.js`);
  if (!fs.existsSync(twin)) return 'missing';
  const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
  return hash(fs.readFileSync(twin, 'utf8')) === hash(source) ? 'in-sync' : 'differs';
}

function summarize(name: string, source: string): WorkflowSummary {
  const { meta, error } = extractMeta(source);
  return {
    name,
    description: meta?.description,
    whenToUse: meta?.whenToUse,
    phases: Array.isArray(meta?.phases)
      ? meta.phases.map((p: any) => ({ title: String(p?.title ?? '?'), detail: p?.detail }))
      : [],
    generated: source.startsWith(WORKFLOW_MARKER),
    metaError: error,
    compositions: detectCompositions(source),
    sync: syncStatus(name, source),
  };
}

export function isConfigured(): boolean {
  return getWorkflowsDir() !== null;
}

export function listWorkflows(): WorkflowSummary[] {
  const root = workflowsRoot();
  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith('.js'))
    .map((f) => summarize(f.replace(/\.js$/, ''), fs.readFileSync(path.join(root, f), 'utf8')))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function readWorkflow(name: string): WorkflowDetail {
  const file = resolveWorkflowFile(name);
  if (!fs.existsSync(file)) throw new Error(`Workflow not found: ${name}`);
  const source = fs.readFileSync(file, 'utf8');
  const summary = summarize(name, source);
  return { ...summary, model: summary.generated ? extractModel(source) : undefined };
}

/** Generate the Workflow-tool script from a step model. All user text enters via JSON.stringify. */
function generateScript(model: WorkflowModel): string {
  const meta = {
    name: model.name,
    description: model.description,
    ...(model.whenToUse?.trim() ? { whenToUse: model.whenToUse.trim() } : {}),
    phases: model.steps.map((s) => ({
      title: s.title,
      detail: s.skill ? `applies the ${s.skill} skill` : s.instructions.slice(0, 80),
    })),
  };

  const stepBlocks = model.steps.map((step, i) => {
    const promptParts: string[] = [];
    if (step.skill) {
      let description = '';
      try {
        description = readSkill(step.skill).description;
      } catch {
        // skill unavailable — reference by name only
      }
      promptParts.push(
        `Load and apply the ${JSON.stringify(step.skill)} skill${description ? ` — ${description}` : ''}.`,
      );
    }
    promptParts.push(`Task: ${step.instructions}`);
    const staticPrompt = promptParts.join('\n\n');
    const prev = i > 0 ? `results[${i - 1}]` : null;
    const promptExpr = prev
      ? `${JSON.stringify(staticPrompt)} + "\\n\\nContext from the previous step:\\n" + ${prev}`
      : JSON.stringify(staticPrompt);
    return `phase(${JSON.stringify(step.title)})\nresults.push(await agent(${promptExpr}))`;
  });

  return `${WORKFLOW_MARKER}
// Generated by the AI Toolkit UI workflow builder — edit in the canvas.
// builderModel below is the source of truth; hand edits to the body are
// overwritten on the next canvas save.
export const meta = ${JSON.stringify(meta, null, 2)}

export const builderModel = ${JSON.stringify(model, null, 2)}

const results = []
${stepBlocks.join('\n\n')}

return results[results.length - 1] ?? null
`;
}

function validateModel(model: WorkflowModel): void {
  const problems: string[] = [];
  if (!NAME_RE.test(model.name ?? '')) {
    problems.push('Workflow name must be kebab-case (lowercase letters, digits, hyphens).');
  }
  if (!model.description?.trim()) problems.push('Give the workflow a description.');
  if (!model.steps?.length) problems.push('Add at least one step.');
  model.steps?.forEach((s, i) => {
    if (!s.title?.trim()) problems.push(`Step ${i + 1}: give it a title.`);
    if (!s.instructions?.trim()) problems.push(`Step ${i + 1}: write its instructions.`);
  });
  if (problems.length) throw new Error(problems.join(' '));
}

/** Syntax-check the generated script (exports stripped, wrapped in an async runtime shell). */
function assertParses(source: string): void {
  const body = source.replace(/^export /gm, '');
  // eslint-disable-next-line no-new-func
  new Function(
    `"use strict"; return async (phase, agent, log, args, budget, workflow, parallel, pipeline) => {\n${body}\n};`,
  );
}

export function writeWorkflow(model: WorkflowModel, opts: { mustExist: boolean }): void {
  validateModel(model);
  const file = resolveWorkflowFile(model.name);
  const exists = fs.existsSync(file);
  if (opts.mustExist && !exists) throw new Error(`Workflow not found: ${model.name}`);
  if (!opts.mustExist && exists) {
    throw new Error(`A workflow named "${model.name}" already exists — pick a different name.`);
  }
  if (exists && !fs.readFileSync(file, 'utf8').startsWith(WORKFLOW_MARKER)) {
    throw new Error(`${model.name} is hand-written — the builder never overwrites it.`);
  }

  const source = generateScript(model);
  assertParses(source);

  fs.writeFileSync(file, source, 'utf8');
  // Managed second location: immediately invokable by Claude Code sessions.
  fs.mkdirSync(CLAUDE_WORKFLOWS_DIR, { recursive: true });
  fs.writeFileSync(path.join(CLAUDE_WORKFLOWS_DIR, `${model.name}.js`), source, 'utf8');
}

/** Copy the workflows-directory version over the ~/.claude/workflows twin. */
export function syncWorkflow(name: string): void {
  const file = resolveWorkflowFile(name);
  if (!fs.existsSync(file)) throw new Error(`Workflow not found: ${name}`);
  fs.mkdirSync(CLAUDE_WORKFLOWS_DIR, { recursive: true });
  fs.copyFileSync(file, path.join(CLAUDE_WORKFLOWS_DIR, `${name}.js`));
}
