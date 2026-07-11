import { execFileSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { isRepo, pendingCount, pushToShipBranch, repoTop } from '@/lib/git';
import { getAgentsDir, getSkillsDir, getWorkflowsDir } from '@/lib/settings';

export const dynamic = 'force-dynamic';

function roots(): { type: string; root: string }[] {
  return [
    { type: 'workflow', root: getWorkflowsDir() ?? '' },
    { type: 'skill', root: getSkillsDir() ?? '' },
    { type: 'agent', root: getAgentsDir() ?? '' },
  ].filter((r) => r.root);
}

/** GET /api/ship — per-root repo + pending-commit status (roots sharing a repo dedupe client-side) */
export async function GET() {
  const status = roots().map(({ type, root }) => {
    const repo = isRepo(root) ? repoTop(root) : null;
    return { type, root, repo, pending: repo ? pendingCount(root) : 0 };
  });
  return NextResponse.json({ status });
}

/** POST /api/ship — { type } → push HEAD to the ship branch and open a PR (batching all pending commits) */
export async function POST(req: NextRequest) {
  let body: { type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const entry = roots().find((r) => r.type === body.type);
  if (!entry) return NextResponse.json({ error: 'unknown or unconfigured type' }, { status: 400 });
  try {
    if (!isRepo(entry.root)) throw new Error('Not a git repository.');
    const branch = pushToShipBranch(entry.root);

    // Open a PR if none exists for the ship branch; degrade gracefully (the
    // push is the essential part — PR creation needs a GitHub remote + gh).
    let prUrl: string | null = null;
    let prError: string | null = null;
    try {
      const existing = execFileSync(
        'gh',
        ['pr', 'list', '--head', branch, '--state', 'open', '--json', 'url', '--jq', '.[0].url'],
        { cwd: entry.root, encoding: 'utf8' },
      ).trim();
      prUrl =
        existing ||
        execFileSync(
          'gh',
          [
            'pr',
            'create',
            '--head',
            branch,
            '--title',
            'chore: toolkit edits via AI Toolkit UI',
            '--body',
            'Batched component edits made through the AI Toolkit UI (versioned saves). Merge-commit recommended over squash to keep local history an ancestor.',
          ],
          { cwd: entry.root, encoding: 'utf8' },
        ).trim();
    } catch (err) {
      prError = err instanceof Error ? err.message.split('\n')[0] : String(err);
    }
    return NextResponse.json({ ok: true, branch, prUrl, prError });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
