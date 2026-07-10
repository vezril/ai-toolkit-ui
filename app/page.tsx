'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ConfigSummary } from '@/lib/configs';
import type { RunMeta } from '@/lib/runs';
import RunButton from './components/RunButton';
import StatusBadge from './components/StatusBadge';

export default function Dashboard() {
  const [configs, setConfigs] = useState<ConfigSummary[] | null>(null);
  const [runs, setRuns] = useState<RunMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/configs')
      .then((r) => r.json())
      .then((b) => (b.error ? setError(b.error) : setConfigs(b.configs)))
      .catch((e) => setError(String(e)));
    fetch('/api/runs')
      .then((r) => r.json())
      .then((b) => setRuns(b.runs ?? []))
      .catch(() => {});
  }, []);

  return (
    <>
      <h1>Eval Configurations</h1>
      <p className="subtitle">
        Pick a config to edit its prompt and tests, or launch an eval run. This is the EDD loop:
        edit → run → read per-dimension results → iterate.
      </p>

      {error && <p className="error-text">{error}</p>}
      {!configs && !error && <p className="dim">Loading configs…</p>}

      {configs?.map((c) => (
        <div className="card" key={c.path}>
          <div className="row spread">
            <div>
              <h3>
                <Link href={`/config?file=${encodeURIComponent(c.path)}`}>{c.description}</Link>
              </h3>
              <div className="meta mono">{c.path}</div>
            </div>
            <div className="row">
              <Link className="btn" href={`/config?file=${encodeURIComponent(c.path)}`}>
                ✎ Edit
              </Link>
              <RunButton config={c.path} />
            </div>
          </div>
          <div className="row">
            <span className="badge">{c.tests.length} tests</span>
            {c.providers.map((p) => (
              <span className="badge" key={`${p.id}-${p.label ?? ''}`}>
                provider: {p.label ?? p.id}
                {p.model ? ` (${p.model})` : ''}
              </span>
            ))}
            {c.grader && <span className="badge">grader: {c.grader.replace(/^exec:\s*/, '')}</span>}
            {c.promptFiles.map((f) => (
              <span className="badge" key={f}>
                prompt: {f}
              </span>
            ))}
          </div>
        </div>
      ))}

      <h2>Recent runs</h2>
      {runs.length === 0 ? (
        <p className="dim">No runs yet. Start one from a config card above.</p>
      ) : (
        <table className="results">
          <thead>
            <tr>
              <th>Started</th>
              <th>Config</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.slice(0, 8).map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.startedAt).toLocaleString()}</td>
                <td className="mono">{r.configPath}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td>
                  <Link href={`/runs/${r.id}`}>view →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
