'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SkillSummary } from '@/lib/skills';

function HealthBadge({ health }: { health: SkillSummary['health'] }) {
  if (health.errors.length) return <span className="badge fail">{health.errors.length} error{health.errors.length > 1 ? 's' : ''}</span>;
  if (health.warnings.length) return <span className="badge running">{health.warnings.length} warning{health.warnings.length > 1 ? 's' : ''}</span>;
  return <span className="badge pass">✓ healthy</span>;
}

export default function SkillsPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
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
