import { NextRequest, NextResponse } from 'next/server';
import { getRun } from '@/lib/runs';
import { loadResults } from '@/lib/results';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) return NextResponse.json({ error: `Run not found: ${id}` }, { status: 404 });
  const results = loadResults(run.outputFile);
  if (!results) {
    return NextResponse.json({ error: 'Results not available for this run' }, { status: 404 });
  }
  return NextResponse.json(results);
}
