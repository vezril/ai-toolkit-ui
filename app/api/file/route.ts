import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { resolveRepoPath } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const relPath = req.nextUrl.searchParams.get('path');
  if (!relPath) return NextResponse.json({ error: 'path query param required' }, { status: 400 });
  try {
    const abs = resolveRepoPath(relPath);
    if (!fs.existsSync(abs)) {
      return NextResponse.json({ error: `File not found: ${relPath}` }, { status: 404 });
    }
    return NextResponse.json({ path: relPath, content: fs.readFileSync(abs, 'utf8') });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  let body: { path?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.path || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'path and content required' }, { status: 400 });
  }
  try {
    const abs = resolveRepoPath(body.path);
    if (!fs.existsSync(abs)) {
      return NextResponse.json({ error: `File not found: ${body.path}` }, { status: 404 });
    }
    fs.writeFileSync(abs, body.content, 'utf8');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
