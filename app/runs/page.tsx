'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { RunMeta } from '@/lib/runs';
import StatusBadge from '../components/StatusBadge';

export default function RunsPage() {
  const [runs, setRuns] = useState<RunMeta[] | null>(null);

  useEffect(() => {
    fetch('/api/runs')
      .then((r) => r.json())
      .then((b) => setRuns(b.runs ?? []))
      .catch(() => setRuns([]));
  }, []);

  return (
    <>
      <h1>Eval Runs</h1>
      <p className="subtitle">Every eval launched from this UI, newest first.</p>
      {!runs && <p className="dim">Loading…</p>}
      {runs && runs.length === 0 && <p className="dim">No runs yet.</p>}
      {runs && runs.length > 0 && (
        <table className="results">
          <thead>
            <tr>
              <th>Started</th>
              <th>Config</th>
              <th>Duration</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.startedAt).toLocaleString()}</td>
                <td className="mono">{r.configPath}</td>
                <td>
                  {r.finishedAt ? `${Math.round((r.finishedAt - r.startedAt) / 1000)}s` : '—'}
                </td>
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
