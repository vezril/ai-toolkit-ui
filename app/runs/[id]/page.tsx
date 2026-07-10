'use client';

import { use, useEffect, useRef, useState } from 'react';
import type { NormalizedResults, TestResult } from '@/lib/results';
import StatusBadge from '../../components/StatusBadge';

interface RunView {
  id: string;
  configPath: string;
  status: 'running' | 'completed' | 'failed';
  exitCode: number | null;
  startedAt: number;
  finishedAt: number | null;
  log: string;
}

function TestRow({ t }: { t: TestResult }) {
  const varsText = Object.entries(t.vars)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ');
  return (
    <div className="card">
      <div className="row spread">
        <h3>{t.description ?? varsText ?? 'Test'}</h3>
        <span className="row">
          {t.score !== null && <span className="badge">score {t.score.toFixed(2)}</span>}
          <span className={`badge ${t.success ? 'pass' : 'fail'}`}>
            {t.success ? 'PASS' : 'FAIL'}
          </span>
        </span>
      </div>
      <div className="meta">
        {t.provider && <span className="badge">{t.provider}</span>} {varsText}
      </div>
      {t.error && <p className="error-text">{t.error}</p>}

      {t.assertions.map((a, i) => (
        <details className="assertion" key={i}>
          <summary>
            <span className={`badge ${a.pass ? 'pass' : 'fail'}`}>{a.pass ? '✓' : '✗'}</span>
            <b>{a.metric ?? a.type}</b>
            {a.score !== null && <span className="dim">score {a.score.toFixed(2)}</span>}
            <span className="dim">({a.type})</span>
          </summary>
          <div className="body">
            {a.criterion && (
              <p>
                <b>Criterion:</b> {a.criterion}
              </p>
            )}
            {a.reason && (
              <p>
                <b>Reason:</b> {a.reason}
              </p>
            )}
          </div>
        </details>
      ))}

      {t.output && (
        <details>
          <summary className="dim" style={{ cursor: 'pointer', margin: '8px 0' }}>
            Model output ({t.output.length.toLocaleString()} chars)
          </summary>
          <div className="output-block">{t.output}</div>
        </details>
      )}
    </div>
  );
}

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<RunView | null>(null);
  const [results, setResults] = useState<NormalizedResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/runs/${id}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error ?? `HTTP ${res.status}`);
          return;
        }
        setRun(body.run);
        if (body.run.status === 'running') {
          timer = setTimeout(poll, 1500);
        } else if (body.run.status === 'completed') {
          const rr = await fetch(`/api/runs/${id}/results`);
          if (rr.ok && !cancelled) setResults(await rr.json());
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  // Keep the live log scrolled to the bottom while running.
  useEffect(() => {
    if (run?.status === 'running' && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [run?.log, run?.status]);

  if (error) return <p className="error-text">{error}</p>;
  if (!run) return <p className="dim">Loading run…</p>;

  const duration = run.finishedAt
    ? `${Math.round((run.finishedAt - run.startedAt) / 1000)}s`
    : `${Math.round((Date.now() - run.startedAt) / 1000)}s and counting`;

  return (
    <>
      <div className="row spread">
        <div>
          <h1 className="row">
            Run <StatusBadge status={run.status} />
          </h1>
          <p className="subtitle">
            <span className="mono">{run.configPath}</span> · started{' '}
            {new Date(run.startedAt).toLocaleString()} · {duration}
          </p>
        </div>
      </div>

      {results && (
        <div className="stat-row">
          <div className="stat">
            <div className="num">{results.stats.total}</div>
            <div className="label">tests</div>
          </div>
          <div className="stat">
            <div className="num" style={{ color: 'var(--pass)' }}>
              {results.stats.passed}
            </div>
            <div className="label">passed</div>
          </div>
          <div className="stat">
            <div className="num" style={{ color: 'var(--fail)' }}>
              {results.stats.failed}
            </div>
            <div className="label">failed</div>
          </div>
          <div className="stat">
            <div className="num">
              {results.stats.total > 0
                ? `${Math.round((results.stats.passed / results.stats.total) * 100)}%`
                : '—'}
            </div>
            <div className="label">pass rate</div>
          </div>
        </div>
      )}

      {results?.results.map((t, i) => <TestRow t={t} key={i} />)}

      {run.status === 'completed' && !results && (
        <p className="dim">Run finished but no parseable results were found.</p>
      )}
      {run.status === 'failed' && (
        <p className="error-text">
          The eval did not produce results (exit code {run.exitCode ?? '?'}). Check the log below —
          the provider CLI may not be installed or the config may be invalid.
        </p>
      )}

      <h2>{run.status === 'running' ? 'Live log' : 'Log'}</h2>
      <pre className="log" ref={logRef}>
        {run.log || '(no output yet)'}
      </pre>
    </>
  );
}
