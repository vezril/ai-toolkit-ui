import { NextRequest, NextResponse } from 'next/server';
import { listRuns, startRun } from '@/lib/runs';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ runs: listRuns() });
}

export async function POST(req: NextRequest) {
  let body: { config?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.config) return NextResponse.json({ error: 'config required' }, { status: 400 });
  try {
    return NextResponse.json({ run: startRun(body.config) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
