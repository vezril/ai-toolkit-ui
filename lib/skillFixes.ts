import crypto from 'crypto';
import fs from 'fs';
import YAML from 'yaml';
import { listSkillDirNames, skillFile } from './skills';

/**
 * Quick-fixes for the MECHANICAL class of skill health findings. Every fix is
 * computed server-side with a line-scoped diff, verified before it is offered
 * (an unverifiable repair simply doesn't appear), guarded by a content hash so
 * a stale preview can never apply, and post-verified after writing (the fix
 * must disappear from a recompute, else the write is reverted).
 *
 * Deliberately absent: bulk sweeps, AI-assisted rewrites (the app makes no
 * direct model calls), and anything touching judgment-class findings.
 */

export interface FixLineChange {
  line: number; // 1-based line number in the file
  before: string | null; // null = insertion
  after: string;
}

export interface SkillFix {
  fixId: string;
  finding: string; // the health finding this addresses
  action: string; // human description of what Apply will do
  changes: FixLineChange[];
}

interface InternalFix extends SkillFix {
  newContent: string;
}

export interface FixesPreview {
  contentHash: string;
  fixes: SkillFix[];
}

function sha(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

interface FrontBlock {
  yamlText: string;
  startLine: number; // 1-based file line where frontmatter content starts
  endLine: number; // 1-based file line of the closing ---
}

function frontBlock(lines: string[]): FrontBlock | null {
  if (lines[0]?.trim() !== '---') return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end < 0) return null;
  return { yamlText: lines.slice(1, end).join('\n'), startLine: 2, endLine: end + 1 };
}

/** Try quoting one line's scalar value; return the repaired line or null. */
function quoteLine(line: string): string | null {
  const m = line.match(/^(\s*[\w-]+:\s+)(.*\S.*)$/);
  if (!m) return null;
  const value = m[2];
  if (/^["'].*["']$/.test(value)) return null; // already quoted
  return `${m[1]}"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function computeInternal(name: string): { content: string; fixes: InternalFix[] } {
  const file = skillFile(name);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const fixes: InternalFix[] = [];
  const front = frontBlock(lines);

  let parsedFront: Record<string, unknown> | null = null;
  let parseErrorLine: number | null = null; // 1-based within the yaml text

  if (front) {
    try {
      const parsed = YAML.parse(front.yamlText);
      parsedFront = parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err: any) {
      parseErrorLine = err?.linePos?.[0]?.line ?? null;
    }
  }

  // Fix 1: quote the scalar that breaks frontmatter parsing (error-anchored,
  // description line as fallback anchor). Offered only if the repair parses.
  if (front && parsedFront === null) {
    const candidates: number[] = [];
    if (parseErrorLine !== null) {
      // The error may point at the line after the offending scalar ends.
      candidates.push(parseErrorLine, parseErrorLine - 1);
    }
    const descIdx = lines
      .slice(front.startLine - 1, front.endLine - 1)
      .findIndex((l) => l.startsWith('description:'));
    if (descIdx >= 0) candidates.push(descIdx + 1);

    for (const yamlLineNo of [...new Set(candidates)]) {
      const fileIdx = front.startLine - 1 + (yamlLineNo - 1);
      if (fileIdx < front.startLine - 1 || fileIdx >= front.endLine - 1) continue;
      const repaired = quoteLine(lines[fileIdx]);
      if (!repaired) continue;
      const newLines = [...lines];
      newLines[fileIdx] = repaired;
      const newFront = frontBlock(newLines);
      try {
        const reparsed = YAML.parse(newFront!.yamlText);
        if (!reparsed || typeof reparsed !== 'object') continue;
      } catch {
        continue; // this candidate doesn't repair it — try the next
      }
      fixes.push({
        fixId: 'quote-frontmatter',
        finding: 'Frontmatter does not parse',
        action: 'Quote the scalar value that breaks YAML parsing',
        changes: [{ line: fileIdx + 1, before: lines[fileIdx], after: repaired }],
        newContent: newLines.join('\n'),
      });
      break;
    }
  }

  // Fix 2: sync frontmatter name to the directory name (parseable front only).
  if (front && parsedFront && parsedFront.name !== name) {
    const nameIdx = lines
      .slice(front.startLine - 1, front.endLine - 1)
      .findIndex((l) => /^name:/.test(l));
    const newLines = [...lines];
    let change: FixLineChange;
    if (nameIdx >= 0) {
      const fileIdx = front.startLine - 1 + nameIdx;
      change = { line: fileIdx + 1, before: lines[fileIdx], after: `name: ${name}` };
      newLines[fileIdx] = `name: ${name}`;
    } else {
      change = { line: front.startLine, before: null, after: `name: ${name}` };
      newLines.splice(front.startLine - 1, 0, `name: ${name}`);
    }
    fixes.push({
      fixId: 'sync-name',
      finding: `Frontmatter name must equal the directory name ("${name}")`,
      action: `Set the frontmatter name to "${name}"`,
      changes: [change],
      newContent: newLines.join('\n'),
    });
  }

  // Fix 3: unresolved [[links]] — replace at Levenshtein ≤ 2, else offer unwrap.
  const siblings = listSkillDirNames();
  const bodyStart = front ? front.endLine : 0; // body lines are after the closing ---
  const unresolved = new Set<string>();
  for (const m of content.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
    if (!siblings.includes(m[1])) unresolved.add(m[1]);
  }
  for (const target of unresolved) {
    const ranked = siblings
      .map((s) => ({ s, d: levenshtein(target, s) }))
      .sort((a, b) => a.d - b.d || a.s.localeCompare(b.s));
    const best = ranked[0];
    const replaceWith = best && best.d <= 2 ? `[[${best.s}]]` : target; // unwrap when no close match
    const isReplace = best && best.d <= 2;

    const changes: FixLineChange[] = [];
    const newLines = lines.map((l, i) => {
      if (i < bodyStart || !l.includes(`[[${target}]]`)) return l;
      const after = l.split(`[[${target}]]`).join(replaceWith);
      changes.push({ line: i + 1, before: l, after });
      return after;
    });
    if (!changes.length) continue;
    fixes.push({
      fixId: `link-${isReplace ? 'replace' : 'unwrap'}:${target}`,
      finding: `[[${target}]] does not resolve to a sibling skill`,
      action: isReplace
        ? `Replace [[${target}]] with [[${best.s}]] (edit distance ${best.d})`
        : `Unwrap [[${target}]] to plain text (no sibling within edit distance 2)`,
      changes,
      newContent: newLines.join('\n'),
    });
  }

  return { content, fixes };
}

export function computeFixes(name: string): FixesPreview {
  const { content, fixes } = computeInternal(name);
  return {
    contentHash: sha(content),
    fixes: fixes.map(({ newContent: _newContent, ...fix }) => fix),
  };
}

export function applyFix(name: string, fixId: string, contentHash: string): void {
  const file = skillFile(name);
  const { content, fixes } = computeInternal(name);
  if (sha(content) !== contentHash) {
    throw new Error('The skill changed since this fix was previewed — re-open the preview.');
  }
  const fix = fixes.find((f) => f.fixId === fixId);
  if (!fix) throw new Error(`Fix no longer available: ${fixId}`);

  fs.writeFileSync(file, fix.newContent, 'utf8');

  // Post-verify: the applied fix must have disappeared from a fresh compute.
  const after = computeInternal(name);
  if (after.fixes.some((f) => f.fixId === fixId)) {
    fs.writeFileSync(file, content, 'utf8'); // revert
    throw new Error(`Fix ${fixId} did not verify after applying — reverted.`);
  }
}
