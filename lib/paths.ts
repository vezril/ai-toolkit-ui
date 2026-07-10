import path from 'path';

/**
 * The promptfoo project this UI operates on.
 * Set PROJECT_ROOT (e.g. in .env.local) to an absolute path; falls back to the
 * parent directory for the legacy layout where this app lived inside the project.
 */
export const REPO_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(process.cwd(), '..');
export const RUNS_DIR = path.join(REPO_ROOT, 'eval-runs');

const EDITABLE_EXTENSIONS = new Set(['.md', '.yaml', '.yml', '.js', '.json']);
const BLOCKED_SEGMENTS = new Set(['node_modules', '.git', 'webui', 'eval-runs']);

/**
 * Resolve a repo-relative path for read/write access from API routes.
 * Rejects traversal outside the repo, internal directories, and
 * file types the UI has no business editing.
 */
export function resolveRepoPath(relPath: string): string {
  const abs = path.resolve(REPO_ROOT, relPath);
  if (!abs.startsWith(REPO_ROOT + path.sep)) {
    throw new Error(`Path escapes repository: ${relPath}`);
  }
  const segments = path.relative(REPO_ROOT, abs).split(path.sep);
  if (segments.some((s) => BLOCKED_SEGMENTS.has(s))) {
    throw new Error(`Path not allowed: ${relPath}`);
  }
  if (!EDITABLE_EXTENSIONS.has(path.extname(abs).toLowerCase())) {
    throw new Error(`File type not allowed: ${relPath}`);
  }
  return abs;
}

export function toRepoRelative(absPath: string): string {
  return path.relative(REPO_ROOT, absPath);
}
