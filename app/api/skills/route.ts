import { NextRequest, NextResponse } from 'next/server';
import {
  isConfigured,
  listSkills,
  readSkill,
  skillHealth,
  writeSkill,
  type SkillForm,
} from '@/lib/skills';

export const dynamic = 'force-dynamic';

/** GET /api/skills — list; GET /api/skills?name=x — one skill's form model */
export async function GET(req: NextRequest) {
  try {
    if (!isConfigured()) return NextResponse.json({ configured: false, skills: [] });
    const name = req.nextUrl.searchParams.get('name');
    if (name) {
      return NextResponse.json({
        configured: true,
        skill: readSkill(name),
        health: skillHealth(name),
      });
    }
    return NextResponse.json({ configured: true, skills: listSkills() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

async function upsert(req: NextRequest, mustExist: boolean) {
  let form: SkillForm;
  try {
    form = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  try {
    const health = writeSkill(form, { mustExist });
    return NextResponse.json({ ok: true, warnings: health.warnings }, { status: mustExist ? 200 : 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

/** POST /api/skills — create a new skill */
export async function POST(req: NextRequest) {
  return upsert(req, false);
}

/** PUT /api/skills — update an existing skill */
export async function PUT(req: NextRequest) {
  return upsert(req, true);
}
