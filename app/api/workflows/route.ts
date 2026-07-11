import { NextRequest, NextResponse } from 'next/server';
import {
  isConfigured,
  listWorkflows,
  readWorkflow,
  syncWorkflow,
  writeWorkflow,
  type WorkflowModel,
} from '@/lib/workflows';

export const dynamic = 'force-dynamic';

/** GET /api/workflows — list; GET /api/workflows?name=x — one workflow's detail */
export async function GET(req: NextRequest) {
  try {
    if (!isConfigured()) return NextResponse.json({ configured: false, workflows: [] });
    const name = req.nextUrl.searchParams.get('name');
    if (name) return NextResponse.json({ configured: true, workflow: readWorkflow(name) });
    return NextResponse.json({ configured: true, workflows: listWorkflows() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

/** POST /api/workflows — create ({model}) or sync (?action=sync, {name}); PUT — update ({model}) */
async function upsert(req: NextRequest, mustExist: boolean) {
  let body: { model?: WorkflowModel; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  try {
    if (req.nextUrl.searchParams.get('action') === 'sync') {
      if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
      syncWorkflow(body.name);
      return NextResponse.json({ ok: true });
    }
    if (!body.model) return NextResponse.json({ error: 'model required' }, { status: 400 });
    writeWorkflow(body.model, { mustExist });
    return NextResponse.json({ ok: true, name: body.model.name }, { status: mustExist ? 200 : 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest) {
  return upsert(req, false);
}

export async function PUT(req: NextRequest) {
  return upsert(req, true);
}
