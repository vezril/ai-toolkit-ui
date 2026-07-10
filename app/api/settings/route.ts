import { NextRequest, NextResponse } from 'next/server';
import { API_PROVIDERS, deleteApiKey, maskedKeys, setApiKey } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/** GET /api/settings — provider catalog with masked key state; never full keys. */
export async function GET() {
  const masked = maskedKeys();
  const providers = API_PROVIDERS.map((p) => {
    const stored = masked.find((m) => m.provider === p.key);
    return {
      key: p.key,
      label: p.label,
      envVar: p.envVar,
      configured: Boolean(stored),
      last4: stored?.last4 ?? null,
      setAt: stored?.setAt ?? null,
    };
  });
  return NextResponse.json({ providers });
}

/** PUT /api/settings — upsert one provider key: { provider, key } */
export async function PUT(req: NextRequest) {
  let body: { provider?: string; key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.provider || typeof body.key !== 'string') {
    return NextResponse.json({ error: 'provider and key required' }, { status: 400 });
  }
  try {
    setApiKey(body.provider, body.key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}

/** DELETE /api/settings?provider=x — remove one provider key */
export async function DELETE(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider');
  if (!provider) return NextResponse.json({ error: 'provider query param required' }, { status: 400 });
  deleteApiKey(provider);
  return NextResponse.json({ ok: true });
}
