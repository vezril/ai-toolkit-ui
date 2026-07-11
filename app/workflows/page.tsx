'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { WorkflowSummary } from '@/lib/workflows';

function SyncBadge({ w }: { w: WorkflowSummary }) {
  if (w.sync === 'in-sync') {
    return (
      <span className="badge pass" title="Identical in ~/.claude/workflows">
        ✓ synced{w.version ? ` v${w.version}` : ''}
      </span>
    );
  }
  if (w.sync === 'differs') {
    const detail =
      w.version && w.deployedVersion
        ? `v${w.version} local · v${w.deployedVersion} deployed`
        : 'differs';
    return <span className="badge running" title="Differs from ~/.claude/workflows">{detail}</span>;
  }
  return <span className="badge fail" title="Not present in ~/.claude/workflows">not in ~/.claude</span>;
}

export default function WorkflowsPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/workflows')
      .then((r) => r.json())
      .then((b) => {
        if (b.error) setError(b.error);
        else {
          setConfigured(b.configured);
          setWorkflows(b.workflows ?? []);
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(load, [load]);

  async function sync(name: string) {
    await fetch('/api/workflows?action=sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    load();
  }

  return (
    <>
      <div className="row spread">
        <div>
          <h1>Workflows</h1>
          <p className="subtitle">
            Claude Code workflow scripts — visualize their shape, build new ones by wiring steps
            to your skills. Runs happen in Claude Code, not here.
          </p>
        </div>
        {configured && (
          <Link className="btn primary" href="/workflows/edit">
            + New workflow
          </Link>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}
      {configured === null && !error && <p className="dim">Loading…</p>}

      {configured === false && (
        <div className="card">
          <h3>No workflows directory configured</h3>
          <p className="dim">
            Point the app at the folder your workflow scripts live in (e.g.{' '}
            <span className="mono">~/Code/claude-toolkit/workflows</span>).
          </p>
          <Link className="btn primary" href="/settings">
            Configure in Settings →
          </Link>
        </div>
      )}

      {workflows.map((w) => (
        <div className="card" key={w.name}>
          <div className="row spread">
            <h3>
              <Link href={`/workflows/edit?name=${encodeURIComponent(w.name)}`}>{w.name}</Link>
            </h3>
            <span className="row">
              {w.generated ? (
                <span className="badge">builder</span>
              ) : (
                <span className="badge" title="Hand-written — visualized read-only">hand-written</span>
              )}
              <span className="badge">{w.phases.length} phases</span>
              {w.compositions.length > 0 && (
                <span className="badge" title={`Calls: ${w.compositions.join(', ')}`}>
                  ⛓ {w.compositions.length}
                </span>
              )}
              <SyncBadge w={w} />
              {w.sync !== 'in-sync' && (
                <button className="link-btn" onClick={() => sync(w.name)} title="Copy this version to ~/.claude/workflows">
                  sync →
                </button>
              )}
            </span>
          </div>
          {w.metaError ? (
            <p className="dim" style={{ fontSize: 13 }}>⚠ {w.metaError}</p>
          ) : (
            <p className="dim" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {w.description}
              {w.whenToUse && <span style={{ opacity: 0.7 }}> — {w.whenToUse}</span>}
            </p>
          )}
        </div>
      ))}
    </>
  );
}
