import { NextRequest, NextResponse } from 'next/server';
import { applyFix, computeFixes } from '@/lib/skillFixes';

export const dynamic = 'force-dynamic';

/** GET /api/skills/fixes?name=x — available quick-fixes with line-scoped diffs */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  try {
    return NextResponse.json(computeFixes(name));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

/** POST /api/skills/fixes — { name, fixId, contentHash } → apply one verified fix */
export async function POST(req: NextRequest) {
  let body: { name?: string; fixId?: string; contentHash?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.name || !body.fixId || !body.contentHash) {
    return NextResponse.json({ error: 'name, fixId, and contentHash required' }, { status: 400 });
  }
  try {
    applyFix(body.name, body.fixId, body.contentHash);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stale = message.includes('changed since this fix was previewed');
    return NextResponse.json({ error: message }, { status: stale ? 409 : 400 });
  }
}
