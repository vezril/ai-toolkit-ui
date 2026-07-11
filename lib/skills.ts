import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { getSkillsDir } from './settings';

/**
 * Agent Skills library: list, read, and write SKILL.md files in the
 * user-configured skills directory (Settings → Skills directory).
 *
 * This module is the ONLY code allowed to touch the skills directory, and it
 * is a separate sandbox root from the eval side's REPO_ROOT (lib/paths.ts) —
 * the two trees must never be reachable through each other's resolvers.
 *
 * Editing stance (deliberately different from the eval builder's ADR-0004
 * bounded fidelity): skills are hand-authored artifacts this builder joins,
 * so unknown frontmatter fields round-trip untouched.
 */

const KEBAB_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 64;
const DESC_BAND_MIN = 200; // claude-toolkit lint band
const DESC_BAND_MAX = 1500;
const DESC_STANDARD_CAP = 1024; // Agent Skills open standard

export interface SkillHealth {
  errors: string[];
  warnings: string[];
}

export interface SkillSummary {
  name: string;
  description: string;
  supportingFiles: string[]; // entries in the skill dir besides SKILL.md
  health: SkillHealth;
}

export interface SkillForm {
  name: string;
  description: string;
  body: string;
  disableModelInvocation?: boolean; // frontmatter: disable-model-invocation
  userInvocable?: boolean; // frontmatter: user-invocable (default true)
  allowedTools?: string; // frontmatter: allowed-tools
  argumentHint?: string; // frontmatter: argument-hint
}

export function isConfigured(): boolean {
  return getSkillsDir() !== null;
}

function skillsRoot(): string {
  const dir = getSkillsDir();
  if (!dir) throw new Error('No skills directory configured — set one in Settings.');
  return dir;
}

/** Resolve a skill's directory; the kebab-case gate doubles as traversal protection. */
function resolveSkillDir(name: string): string {
  const root = skillsRoot();
  if (!KEBAB_NAME.test(name)) throw new Error(`Invalid skill name: ${name}`);
  const abs = path.resolve(root, name);
  if (!abs.startsWith(root + path.sep)) throw new Error(`Invalid skill name: ${name}`);
  return abs;
}

interface ParsedSkill {
  front: Record<string, unknown>;
  body: string;
  frontError?: string;
}

function parseSkillMd(text: string): ParsedSkill {
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

function listSiblingDirs(root: string): string[] {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .filter((e) => e.isDirectory() || e.isSymbolicLink())
    .map((e) => e.name)
    .filter((name) => {
      try {
        return fs.statSync(path.join(root, name)).isDirectory();
      } catch {
        return false;
      }
    });
}

function hasNestedSkillMd(skillDir: string): boolean {
  try {
    return fs
      .readdirSync(skillDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .some((sub) => fs.existsSync(path.join(skillDir, sub.name, 'SKILL.md')));
  } catch {
    return false;
  }
}

export function validateSkill(
  dirName: string,
  parsed: ParsedSkill,
  siblingDirs: string[],
): SkillHealth {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (parsed.frontError) errors.push(parsed.frontError);
  if (!KEBAB_NAME.test(dirName)) {
    errors.push(`Name must be kebab-case (lowercase letters, digits, hyphens): "${dirName}"`);
  }
  if (dirName.length > NAME_MAX) errors.push(`Name exceeds ${NAME_MAX} characters`);

  const frontName = String(parsed.front.name ?? '');
  if (!frontName) errors.push('Frontmatter is missing a name field');
  else if (frontName !== dirName) {
    errors.push(`Frontmatter name ("${frontName}") must equal the directory name ("${dirName}")`);
  }

  const description = String(parsed.front.description ?? '').trim();
  if (!description) errors.push('Frontmatter is missing a description');
  else {
    if (description.length < DESC_BAND_MIN) {
      warnings.push(
        `Description is ${description.length} chars — below the recommended ${DESC_BAND_MIN}–${DESC_BAND_MAX} band; short descriptions under-trigger`,
      );
    }
    if (description.length > DESC_BAND_MAX) {
      warnings.push(
        `Description is ${description.length} chars — above the recommended ${DESC_BAND_MIN}–${DESC_BAND_MAX} band; it is always loaded into context`,
      );
    } else if (description.length > DESC_STANDARD_CAP) {
      warnings.push(
        `Description is ${description.length} chars — over the Agent Skills standard's ${DESC_STANDARD_CAP}-char cap (fine for Claude Code, may not port to other tools)`,
      );
    }
  }

  if (!parsed.body.trim()) errors.push('Skill body is empty');

  for (const match of parsed.body.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
    if (!siblingDirs.includes(match[1])) {
      warnings.push(`[[${match[1]}]] does not resolve to a sibling skill`);
    }
  }

  return { errors, warnings };
}

export function listSkills(): SkillSummary[] {
  const root = skillsRoot();
  const dirs = listSiblingDirs(root);
  return dirs
    .filter((name) => fs.existsSync(path.join(root, name, 'SKILL.md')))
    .map((name) => {
      const skillDir = path.join(root, name);
      const parsed = parseSkillMd(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8'));
      const health = validateSkill(name, parsed, dirs);
      if (hasNestedSkillMd(skillDir)) {
        health.errors.push('Contains a nested SKILL.md (discovery is one level deep)');
      }
      return {
        name,
        description: String(parsed.front.description ?? ''),
        supportingFiles: fs.readdirSync(skillDir).filter((f) => f !== 'SKILL.md'),
        health,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function readSkill(name: string): SkillForm {
  const skillDir = resolveSkillDir(name);
  const file = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(file)) throw new Error(`Skill not found: ${name}`);
  const parsed = parseSkillMd(fs.readFileSync(file, 'utf8'));
  const f = parsed.front;
  const allowedTools = f['allowed-tools'];
  return {
    name,
    description: String(f.description ?? ''),
    body: parsed.body,
    disableModelInvocation: f['disable-model-invocation'] === true ? true : undefined,
    userInvocable: f['user-invocable'] === false ? false : undefined,
    allowedTools: Array.isArray(allowedTools)
      ? allowedTools.join(', ')
      : allowedTools != null
        ? String(allowedTools)
        : undefined,
    argumentHint: f['argument-hint'] != null ? String(f['argument-hint']) : undefined,
  };
}

/** Overlay only the form-modeled fields; every other frontmatter key survives. */
function mergeFront(
  existing: Record<string, unknown>,
  form: SkillForm,
): Record<string, unknown> {
  const front: Record<string, unknown> = { ...existing };
  front.name = form.name;
  front.description = form.description.trim();
  if (form.disableModelInvocation) front['disable-model-invocation'] = true;
  else delete front['disable-model-invocation']; // default false
  if (form.userInvocable === false) front['user-invocable'] = false;
  else delete front['user-invocable']; // default true
  if (form.allowedTools?.trim()) front['allowed-tools'] = form.allowedTools.trim();
  else delete front['allowed-tools'];
  if (form.argumentHint?.trim()) front['argument-hint'] = form.argumentHint.trim();
  else delete front['argument-hint'];
  return front;
}

export function writeSkill(form: SkillForm, opts: { mustExist: boolean }): SkillHealth {
  const skillDir = resolveSkillDir(form.name); // kebab gate + sandbox
  const file = path.join(skillDir, 'SKILL.md');
  const exists = fs.existsSync(file);
  if (opts.mustExist && !exists) throw new Error(`Skill not found: ${form.name}`);
  if (!opts.mustExist && exists) {
    throw new Error(`A skill named "${form.name}" already exists — pick a different name.`);
  }

  const existingFront = exists
    ? parseSkillMd(fs.readFileSync(file, 'utf8')).front
    : {};
  const front = mergeFront(existingFront, form);
  // Normalize to exactly one blank line after the frontmatter and one trailing newline.
  const body = form.body.replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n';

  const root = skillsRoot();
  const health = validateSkill(form.name, { front, body }, listSiblingDirs(root));
  if (health.errors.length) throw new Error(health.errors.join(' '));

  // lineWidth: 0 keeps hand-written single-line descriptions single-line.
  const frontYaml = YAML.stringify(front, { lineWidth: 0 });
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(file, `---\n${frontYaml}---\n\n${body}`, 'utf8');
  return health; // errors empty; warnings inform the UI
}
