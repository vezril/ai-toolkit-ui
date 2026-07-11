import fs from 'fs';
import path from 'path';
import { addAndCommit, isRepo } from './git';

/**
 * Toolkit versioning: a versions.json registry per component directory plus
 * the save-commit choreography. Every UI write in a git-tracked component
 * root becomes: write file(s) → bump patch → scoped commit of exactly those
 * files + the registry. Outside a git repo everything degrades to plain
 * writes (no registry, no commits, no errors).
 */

export type ComponentType = 'workflow' | 'skill' | 'agent';

interface VersionEntry {
  version: string;
  deployedVersion?: string;
}

type Registry = Record<string, VersionEntry>;

const REGISTRY_FILE = 'versions.json';

function registryPath(root: string): string {
  return path.join(root, REGISTRY_FILE);
}

export function readRegistry(root: string): Registry {
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath(root), 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRegistry(root: string, registry: Registry): void {
  fs.writeFileSync(registryPath(root), JSON.stringify(registry, null, 2) + '\n', 'utf8');
}

function bumpPatch(version: string): string {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return '1.0.0';
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

export function currentVersion(root: string, name: string): string | undefined {
  return readRegistry(root)[name]?.version;
}

/** Record what version a copy-style deploy carried (called by sync paths). */
export function recordDeployed(root: string, name: string): void {
  if (!isRepo(root)) return;
  const registry = readRegistry(root);
  const entry = registry[name];
  if (!entry) return;
  if (entry.deployedVersion === entry.version) return;
  entry.deployedVersion = entry.version;
  writeRegistry(root, registry);
  addAndCommit(root, [REGISTRY_FILE], `${path.basename(root)}: record ${name} deployed at v${entry.version}`);
}

export interface VersionedSaveResult {
  version: string | null; // null = not a repo, plain write happened upstream
  sha?: string;
}

/**
 * The choreography. Call AFTER the component file(s) have been written.
 * `files` are paths relative to (or absolute inside) the component root that
 * the app wrote for this save — nothing else is ever staged.
 */
export function versionedSave(
  root: string,
  type: ComponentType,
  name: string,
  files: string[],
  action: string,
  opts: { alsoDeployed?: boolean } = {},
): VersionedSaveResult {
  if (!isRepo(root)) return { version: null };

  const registry = readRegistry(root);
  const previous = registry[name]?.version;
  const version = previous ? bumpPatch(previous) : '1.0.0';
  registry[name] = { ...registry[name], version };
  if (opts.alsoDeployed) registry[name].deployedVersion = version;
  writeRegistry(root, registry);

  const sha = addAndCommit(
    root,
    [...files, REGISTRY_FILE],
    `${type}(${name}): v${version} — ${action}`,
  );
  return { version, sha };
}
