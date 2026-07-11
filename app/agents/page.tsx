'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AgentSummary } from '@/lib/agents';

function DeployBadge({ deploy }: { deploy: AgentSummary['deploy'] }) {
  if (deploy === 'symlinked') return <span className="badge pass" title="~/.claude/agents symlinks here — always current">⟲ symlinked</span>;
  if (deploy === 'in-sync') return <span className="badge pass" title="Copy in ~/.claude/agents matches">✓ deployed</span>;
  if (deploy === 'differs') return <span className="badge running" title="Copy in ~/.claude/agents differs">differs</span>;
  return <span className="badge" title="Not present in ~/.claude/agents">not deployed</span>;
}

function HealthBadge({ health }: { health: AgentSummary['health'] }) {
  if (health.errors.length) return <span className="badge fail">{health.errors.length} error{health.errors.length > 1 ? 's' : ''}</span>;
  if (health.warnings.length) return <span className="badge running">{health.warnings.length} warning{health.warnings.length > 1 ? 's' : ''}</span>;
  return <span className="badge pass">✓ healthy</span>;
}

export default function AgentsPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((b) => {
        if (b.error) setError(b.error);
        else {
          setConfigured(b.configured);
          setAgents(b.agents ?? []);
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <>
      <div className="row spread">
        <div>
          <h1>Agents</h1>
          <p className="subtitle">
            Agent definitions in your configured agents directory — the descriptions drive
            delegation routing, so they get the same coaching as skills.
          </p>
        </div>
        {configured && (
          <Link className="btn primary" href="/agents/edit">
            + New agent
          </Link>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}
      {configured === null && !error && <p className="dim">Loading…</p>}

      {configured === false && (
        <div className="card">
          <h3>No agents directory configured</h3>
          <p className="dim">
            Point the app at the folder your agent definitions live in (e.g.{' '}
            <span className="mono">~/Code/claude-toolkit/agents</span>).
          </p>
          <Link className="btn primary" href="/settings">
            Configure in Settings →
          </Link>
        </div>
      )}

      {agents.map((a) => (
        <div className="card" key={a.name}>
          <div className="row spread">
            <h3>
              <Link href={`/agents/edit?name=${encodeURIComponent(a.name)}`}>{a.name}</Link>
            </h3>
            <span className="row">
              {a.tools && (
                <span className="badge" title={a.tools}>
                  🛠 {a.tools.split(',').length}
                </span>
              )}
              <DeployBadge deploy={a.deploy} />
              <HealthBadge health={a.health} />
            </span>
          </div>
          <p className="dim" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {a.description.length > 220 ? `${a.description.slice(0, 220)}…` : a.description}
          </p>
          {a.health.errors.length > 0 && (
            <p className="error-text" style={{ fontSize: 13, marginBottom: 0 }}>
              {a.health.errors.join(' · ')}
            </p>
          )}
        </div>
      ))}
    </>
  );
}
