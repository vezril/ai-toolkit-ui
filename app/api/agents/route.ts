import { NextRequest, NextResponse } from 'next/server';
import { isConfigured, listAgents, readAgent, writeAgent, type AgentForm } from '@/lib/agents';

export const dynamic = 'force-dynamic';

/** GET /api/agents — list; GET /api/agents?name=x — one agent's form model */
export async function GET(req: NextRequest) {
  try {
    if (!isConfigured()) return NextResponse.json({ configured: false, agents: [] });
    const name = req.nextUrl.searchParams.get('name');
    if (name) return NextResponse.json({ configured: true, agent: readAgent(name) });
    return NextResponse.json({ configured: true, agents: listAgents() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

async function upsert(req: NextRequest, mustExist: boolean) {
  let form: AgentForm;
  try {
    form = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  try {
    const health = writeAgent(form, { mustExist });
    return NextResponse.json({ ok: true, warnings: health.warnings }, { status: mustExist ? 200 : 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

/** POST /api/agents — create */
export async function POST(req: NextRequest) {
  return upsert(req, false);
}

/** PUT /api/agents — update */
export async function PUT(req: NextRequest) {
  return upsert(req, true);
}
