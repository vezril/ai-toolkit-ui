import { NextRequest, NextResponse } from 'next/server';
import {
  allSkillEvalStatuses,
  createOrSyncSkillEval,
  skillEvalStatus,
} from '@/lib/skillEval';

export const dynamic = 'force-dynamic';

/** GET /api/skills/eval?name=x — one skill's eval status; without name — all statuses */
export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name');
    if (name) return NextResponse.json(skillEvalStatus(name));
    return NextResponse.json({ statuses: allSkillEvalStatuses() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

/** POST /api/skills/eval — { name } → create the starter eval or sync its prompt file */
export async function POST(req: NextRequest) {
  let body: { name?: string; ab?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  try {
    const result = createOrSyncSkillEval(body.name, { ab: body.ab });
    return NextResponse.json(result, { status: result.action === 'created' ? 201 : 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
