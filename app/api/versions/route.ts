import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { dirtyVsHead, isRepo, logFollow, showAt } from '@/lib/git';
import { getAgentsDir, getSkillsDir, getWorkflowsDir } from '@/lib/settings';
import { currentVersion, versionedSave, type ComponentType } from '@/lib/versions';

export const dynamic = 'force-dynamic';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface Component {
  root: string;
  file: string; // relative to root
  deployTwin?: string; // copy-style twin to refresh on restore
}

function resolveComponent(type: string, name: string): Component {
  if (!KEBAB.test(name)) throw new Error(`Invalid name: ${name}`);
  if (type === 'workflow') {
    const root = getWorkflowsDir();
    if (!root) throw new Error('No workflows directory configured.');
    return {
      root,
      file: `${name}.js`,
      deployTwin: path.join(os.homedir(), '.claude', 'workflows', `${name}.js`),
    };
  }
  if (type === 'skill') {
    const root = getSkillsDir();
    if (!root) throw new Error('No skills directory configured.');
    return { root, file: `${name}/SKILL.md` };
  }
  if (type === 'agent') {
    const root = getAgentsDir();
    if (!root) throw new Error('No agents directory configured.');
    return { root, file: `${name}.md` };
  }
  throw new Error(`Unknown component type: ${type}`);
}

/** GET /api/versions?type=&name= — history for one component */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? '';
  const name = req.nextUrl.searchParams.get('name') ?? '';
  try {
    const c = resolveComponent(type, name);
    if (!isRepo(c.root)) return NextResponse.json({ versioned: false, entries: [] });
    return NextResponse.json({
      versioned: true,
      current: currentVersion(c.root, name) ?? null,
      dirty: dirtyVsHead(c.root, c.file),
      entries: logFollow(c.root, c.file),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

/** POST /api/versions — restore: { type, name, sha }. Forward-only, loss-free. */
export async function POST(req: NextRequest) {
  let body: { type?: string; name?: string; sha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.type || !body.name || !body.sha) {
    return NextResponse.json({ error: 'type, name, and sha required' }, { status: 400 });
  }
  try {
    const c = resolveComponent(body.type, body.name);
    if (!isRepo(c.root)) throw new Error('This directory is not git-tracked — nothing to restore.');
    const type = body.type as ComponentType;

    // Never lose the present: a dirty file gets its own preserving version first.
    if (dirtyVsHead(c.root, c.file)) {
      versionedSave(c.root, type, body.name, [c.file], 'uncommitted changes preserved');
    }

    const content = showAt(c.root, body.sha, c.file);
    fs.writeFileSync(path.resolve(c.root, c.file), content, 'utf8');
    if (c.deployTwin && fs.existsSync(path.dirname(c.deployTwin))) {
      fs.writeFileSync(c.deployTwin, content, 'utf8');
    }
    const result = versionedSave(
      c.root,
      type,
      body.name,
      [c.file],
      `restored from ${body.sha.slice(0, 7)}`,
      { alsoDeployed: Boolean(c.deployTwin) },
    );
    return NextResponse.json({ ok: true, version: result.version });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
