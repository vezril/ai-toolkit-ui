'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RunButton({ config, label = 'Run eval' }: { config: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.push(`/runs/${body.run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <span className="row">
      <button className="primary" onClick={start} disabled={busy}>
        {busy ? 'Starting…' : `▶ ${label}`}
      </button>
      {error && <span className="error-text">{error}</span>}
    </span>
  );
}
