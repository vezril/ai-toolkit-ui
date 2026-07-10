import { NextResponse } from 'next/server';
import { listConfigs } from '@/lib/configs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ configs: listConfigs() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
