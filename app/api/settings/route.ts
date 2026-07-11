import { NextRequest, NextResponse } from 'next/server';
import {
  API_PROVIDERS,
  deleteApiKey,
  getAgentsDir,
  getRunGuardrails,
  getSkillsDir,
  getWorkflowsDir,
  maskedKeys,
  setAgentsDir,
  setApiKey,
  setRunGuardrails,
  setSkillsDir,
  setWorkflowsDir,
  type RunGuardrails,
} from '@/lib/settings';

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
  return NextResponse.json({
    providers,
    skillsDir: getSkillsDir(),
    workflowsDir: getWorkflowsDir(),
    agentsDir: getAgentsDir(),
    runGuardrails: getRunGuardrails(),
  });
}

/** PUT /api/settings — upsert one provider key ({ provider, key }), the skills directory ({ skillsDir }), or run guardrails ({ runGuardrails }) */
export async function PUT(req: NextRequest) {
  let body: {
    provider?: string;
    key?: string;
    skillsDir?: string;
    workflowsDir?: string;
    agentsDir?: string;
    runGuardrails?: Partial<RunGuardrails>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  try {
    if (body.runGuardrails !== undefined) {
      setRunGuardrails(body.runGuardrails);
      return NextResponse.json({ ok: true, runGuardrails: getRunGuardrails() });
    }
    if (typeof body.skillsDir === 'string') {
      setSkillsDir(body.skillsDir);
      return NextResponse.json({ ok: true, skillsDir: getSkillsDir() });
    }
    if (typeof body.workflowsDir === 'string') {
      setWorkflowsDir(body.workflowsDir);
      return NextResponse.json({ ok: true, workflowsDir: getWorkflowsDir() });
    }
    if (typeof body.agentsDir === 'string') {
      setAgentsDir(body.agentsDir);
      return NextResponse.json({ ok: true, agentsDir: getAgentsDir() });
    }
    if (!body.provider || typeof body.key !== 'string') {
      return NextResponse.json({ error: 'provider and key (or skillsDir) required' }, { status: 400 });
    }
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
