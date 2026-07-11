'use client';

import { useCallback, useEffect, useState } from 'react';

interface Entry {
  sha: string;
  date: string;
  message: string;
}

/**
 * Git-backed version history for a toolkit component. Renders nothing when
 * the component's directory isn't git-tracked (degradation per spec).
 * Restore is forward-only and loss-free — the server preserves dirty state
 * as its own version before restoring.
 */
export default function HistoryPanel({
  type,
  name,
  onRestored,
}: {
  type: 'workflow' | 'skill' | 'agent';
  name: string;
  onRestored?: () => void;
}) {
  const [versioned, setVersioned] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/versions?type=${type}&name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((b) => {
        setVersioned(Boolean(b.versioned));
        setCurrent(b.current ?? null);
        setEntries(b.entries ?? []);
      })
      .catch(() => setVersioned(false));
  }, [type, name]);

  useEffect(load, [load]);

  if (!versioned || entries.length === 0) return null;

  async function restore(sha: string) {
    setBusy(sha);
    setError(null);
    try {
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, sha }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      load();
      onRestored?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
        History{current ? ` — v${current}` : ''} ({entries.length})
      </summary>
      <p className="dim" style={{ fontSize: 12.5, margin: '6px 0' }}>
        Restore copies an old version forward as a new commit — nothing is ever lost.
      </p>
      {error && <p className="error-text">{error}</p>}
      <ul className="dim" style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
        {entries.map((e, i) => (
          <li key={e.sha} className="row spread" style={{ padding: '4px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 13 }}>
              <span className="mono">{e.sha.slice(0, 7)}</span> · {e.message}
              <span style={{ opacity: 0.6 }}> · {new Date(e.date).toLocaleString()}</span>
            </span>
            {i > 0 && (
              <button className="link-btn" disabled={busy !== null} onClick={() => restore(e.sha)}>
                {busy === e.sha ? 'Restoring…' : 'Restore'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
