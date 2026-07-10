'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { ConfigSummary } from '@/lib/configs';
import FileEditor from '../components/FileEditor';
import RunButton from '../components/RunButton';

function Overview({ config }: { config: ConfigSummary }) {
  return (
    <>
      <div className="card">
        <h3>Providers</h3>
        <div className="row" style={{ marginTop: 8 }}>
          {config.providers.map((p) => (
            <span className="badge" key={`${p.id}-${p.label ?? ''}`}>
              {p.label ?? (p.model ? `${p.id} (${p.model})` : p.id)}
            </span>
          ))}
          {config.grader && (
            <span className="badge">grader: {config.grader.replace(/^exec:\s*/, '')}</span>
          )}
        </div>
        {config.suiteFiles.length > 0 && (
          <p className="dim" style={{ marginBottom: 0 }}>
            Includes test suites: {config.suiteFiles.join(', ')}
          </p>
        )}
      </div>

      <h2>Tests ({config.tests.length})</h2>
      {config.tests.map((t, i) => (
        <div className="card" key={i}>
          <h3>{t.description ?? `Test ${i + 1}`}</h3>
          <div className="meta">
            from <span className="mono">{t.source}</span>
            {t.vars &&
              Object.entries(t.vars).map(([k, v]) => (
                <div key={k}>
                  <b>{k}:</b> {String(v)}
                </div>
              ))}
          </div>
          <div className="row">
            {t.asserts.map((a, j) => (
              <span className="badge" key={j} title={a.value}>
                {a.type}
                {a.metric ? `: ${a.metric}` : ''}
                {a.threshold !== undefined ? ` ≥${a.threshold}` : ''}
                {a.weight !== undefined ? ` ×${a.weight}` : ''}
              </span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ConfigPageInner() {
  const file = useSearchParams().get('file');
  const [config, setConfig] = useState<ConfigSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'yaml' | string>('overview');

  useEffect(() => {
    if (!file) return;
    fetch('/api/configs')
      .then((r) => r.json())
      .then((b) => {
        const match = (b.configs ?? []).find((c: ConfigSummary) => c.path === file);
        if (match) setConfig(match);
        else setError(`No promptfoo config found at ${file}`);
      })
      .catch((e) => setError(String(e)));
  }, [file, tab]); // refetch summary after tab switches so YAML edits show up in Overview

  if (!file) return <p className="error-text">Missing ?file= query parameter.</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!config) return <p className="dim">Loading…</p>;

  return (
    <>
      <div className="row spread">
        <div>
          <h1>{config.description}</h1>
          <p className="subtitle mono">{config.path}</p>
        </div>
        <span className="row">
          {config.generated && (
            <Link className="btn" href={`/new?config=${encodeURIComponent(config.path)}`}>
              ✎ Edit in builder
            </Link>
          )}
          <RunButton config={config.path} />
        </span>
      </div>

      <div className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={tab === 'yaml' ? 'active' : ''} onClick={() => setTab('yaml')}>
          Config YAML
        </button>
        {config.promptFiles.map((f) => (
          <button key={f} className={tab === f ? 'active' : ''} onClick={() => setTab(f)}>
            {f.split('/').pop()}
          </button>
        ))}
        {config.suiteFiles.map((f) => (
          <button key={f} className={tab === f ? 'active' : ''} onClick={() => setTab(f)}>
            {f.split('/').pop()}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview config={config} />}
      {tab === 'yaml' && <FileEditor path={config.path} />}
      {tab !== 'overview' && tab !== 'yaml' && <FileEditor path={tab} />}
    </>
  );
}

export default function ConfigPage() {
  return (
    <Suspense fallback={<p className="dim">Loading…</p>}>
      <ConfigPageInner />
    </Suspense>
  );
}
