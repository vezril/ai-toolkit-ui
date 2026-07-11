'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SkillSummary } from '@/lib/skills';

type EvalStatus = 'none' | 'current' | 'stale' | 'conflict';

function EvalShortcut({ name, status }: { name: string; status: EvalStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function createOrSync() {
    setBusy(true);
    try {
      const res = await fetch('/api/skills/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (res.ok) router.push(`/new?config=${encodeURIComponent(body.configPath)}`);
    } finally {
      setBusy(false);
    }
  }

  if (status === 'conflict') return <span className="badge fail" title="A hand-written eval occupies this name">eval conflict</span>;
  if (status === 'none') {
    return (
      <button className="link-btn" onClick={createOrSync} disabled={busy} title="Create an EDD eval that embeds this skill">
        {busy ? '…' : '⚗ EDD eval'}
      </button>
    );
  }
  return (
    <span className="row" style={{ gap: 4 }}>
      {status === 'stale' && (
        <button className="link-btn" onClick={createOrSync} disabled={busy} title="Skill changed since last sync — sync and open">
          {busy ? '…' : '⚠ sync'}
        </button>
      )}
      <Link href={`/new?config=${encodeURIComponent(`evals/skill-${name}.config.yaml`)}`} title="Open this skill's EDD eval">
        eval →
      </Link>
    </span>
  );
}

function HealthBadge({ health }: { health: SkillSummary['health'] }) {
  if (health.errors.length) return <span className="badge fail">{health.errors.length} error{health.errors.length > 1 ? 's' : ''}</span>;
  if (health.warnings.length) return <span className="badge running">{health.warnings.length} warning{health.warnings.length > 1 ? 's' : ''}</span>;
  return <span className="badge pass">✓ healthy</span>;
}

export default function SkillsPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [evalStatuses, setEvalStatuses] = useState<Record<string, EvalStatus>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((b) => {
        if (b.error) setError(b.error);
        else {
          setConfigured(b.configured);
          setSkills(b.skills ?? []);
        }
      })
      .catch((e) => setError(String(e)));
    fetch('/api/skills/eval')
      .then((r) => r.json())
      .then((b) => setEvalStatuses(b.statuses ?? {}))
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="row spread">
        <div>
          <h1>Skills</h1>
          <p className="subtitle">
            Agent Skills in your configured skills directory — structural health checked against
            the SKILL.md authoring rules.
          </p>
        </div>
        {configured && (
          <Link className="btn primary" href="/skills/edit">
            + New skill
          </Link>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}
      {configured === null && !error && <p className="dim">Loading…</p>}

      {configured === false && (
        <div className="card">
          <h3>No skills directory configured</h3>
          <p className="dim">
            Point the app at the folder your skills live in (e.g.{' '}
            <span className="mono">~/Code/claude-toolkit/skills</span>) to browse, create, and
            edit them here.
          </p>
          <Link className="btn primary" href="/settings">
            Configure in Settings →
          </Link>
        </div>
      )}

      {configured && skills.length === 0 && (
        <p className="dim">No skills found — create your first one.</p>
      )}

      {skills.map((s) => (
        <div className="card" key={s.name}>
          <div className="row spread">
            <h3>
              <Link href={`/skills/edit?name=${encodeURIComponent(s.name)}`}>{s.name}</Link>
            </h3>
            <span className="row">
              <EvalShortcut name={s.name} status={evalStatuses[s.name] ?? 'none'} />
              {s.supportingFiles.length > 0 && (
                <span className="badge" title={s.supportingFiles.join(', ')}>
                  +{s.supportingFiles.length} file{s.supportingFiles.length > 1 ? 's' : ''}
                </span>
              )}
              <HealthBadge health={s.health} />
            </span>
          </div>
          <p className="dim" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {s.description.length > 220 ? `${s.description.slice(0, 220)}…` : s.description}
          </p>
          {s.health.errors.length > 0 && (
            <p className="error-text" style={{ fontSize: 13, marginBottom: 0 }}>
              {s.health.errors.join(' · ')}
            </p>
          )}
        </div>
      ))}
    </>
  );
}
