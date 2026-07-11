import { execFileSync } from 'child_process';
import path from 'path';

/**
 * The app's ONLY git execution surface (ADR-0011). A closed allowlist of
 * verbs, each spawned per call with cwd = the component root. Deliberately
 * absent from the vocabulary: checkout, merge, rebase, stash, branch — the
 * app never moves the user's working tree, and staging is always explicit
 * pathspecs (never `add .`, never `commit -a`), so files the app didn't
 * write can never enter its commits.
 */

const SHIP_BRANCH = 'toolkit-ui-ship';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Is this directory inside a git work tree? */
export function isRepo(dir: string): boolean {
  try {
    return git(dir, ['rev-parse', '--is-inside-work-tree']).trim() === 'true';
  } catch {
    return false;
  }
}

/** Top-level directory of the repo containing dir (for deduping roots that share a repo). */
export function repoTop(dir: string): string | null {
  try {
    return git(dir, ['rev-parse', '--show-toplevel']).trim();
  } catch {
    return null;
  }
}

function assertInside(root: string, file: string): string {
  const abs = path.resolve(root, file);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    throw new Error(`Path escapes component root: ${file}`);
  }
  return abs;
}

/** Stage exactly the given files and commit them. Returns the new commit sha. */
export function addAndCommit(root: string, files: string[], message: string): string {
  const abs = files.map((f) => assertInside(root, f));
  git(root, ['add', '--', ...abs]);
  // --only restricts the commit to these pathspecs even if other files are staged.
  git(root, ['commit', '--only', '-m', message, '--', ...abs]);
  return git(root, ['rev-parse', 'HEAD']).trim();
}

export interface HistoryEntry {
  sha: string;
  date: string;
  message: string;
}

/** Commit history of one file, newest first. */
export function logFollow(root: string, file: string, limit = 50): HistoryEntry[] {
  const abs = assertInside(root, file);
  try {
    const out = git(root, [
      'log',
      '--follow',
      `--max-count=${limit}`,
      '--format=%H%x1f%aI%x1f%s',
      '--',
      abs,
    ]);
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, date, message] = line.split('\x1f');
        return { sha, date, message };
      });
  } catch {
    return [];
  }
}

/** File content at a revision. */
export function showAt(root: string, sha: string, file: string): string {
  const abs = assertInside(root, file);
  const rel = path.relative(repoTop(root) ?? root, abs);
  if (!/^[0-9a-f]{4,40}$|^HEAD$/i.test(sha)) throw new Error(`Invalid revision: ${sha}`);
  return git(root, ['show', `${sha}:${rel}`]);
}

/** Does the working-tree file differ from HEAD's version (or is it untracked-with-content)? */
export function dirtyVsHead(root: string, file: string): boolean {
  const abs = assertInside(root, file);
  try {
    return git(root, ['status', '--porcelain', '--', abs]).trim().length > 0;
  } catch {
    return false;
  }
}

/** Commits on HEAD not on the upstream of the default remote branch. */
export function pendingCount(root: string): number {
  try {
    const upstream = git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
      .trim();
    return parseInt(git(root, ['rev-list', '--count', `${upstream}..HEAD`]).trim(), 10) || 0;
  } catch {
    return 0; // no upstream — nothing meaningful to count
  }
}

/**
 * Push HEAD to the app-owned remote ship branch (no local branch is created
 * or switched). Force is safe: the branch exists only for the app's PRs.
 */
export function pushToShipBranch(root: string): string {
  git(root, ['push', '--force', 'origin', `HEAD:refs/heads/${SHIP_BRANCH}`]);
  return SHIP_BRANCH;
}
