'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { AgentForm } from '@/lib/agents';

const DESC_BAND_MIN = 200;
const DESC_BAND_MAX = 1500;

function DescriptionCounter({ length }: { length: number }) {
  const inBand = length >= DESC_BAND_MIN && length <= DESC_BAND_MAX;
  return (
    <span style={{ fontSize: 12.5, color: inBand ? 'var(--pass)' : 'var(--fail)' }}>
      {length} chars —{' '}
      {inBand
        ? 'in the recommended band'
        : length < DESC_BAND_MIN
          ? `below the ${DESC_BAND_MIN}-char minimum — thin descriptions under-route`
          : `above the ${DESC_BAND_MAX}-char maximum`}
    </span>
  );
}

function EditorInner() {
  const router = useRouter();
  const editName = useSearchParams().get('name');

  const [form, setForm] = useState<AgentForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    if (!editName) {
      setForm({ name: '', description: '', body: '' });
      return;
    }
    fetch(`/api/agents?name=${encodeURIComponent(editName)}`)
      .then((r) => r.json())
      .then((b) => (b.error ? setError(b.error) : setForm(b.agent)))
      .catch((e) => setError(String(e)));
  }, [editName]);

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    setWarnings([]);
    setSavedNote(false);
    try {
      const res = await fetch('/api/agents', {
        method: editName ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setWarnings(body.warnings ?? []);
      setSavedNote(true);
      if (!editName) router.replace(`/agents/edit?name=${encodeURIComponent(form.name)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !form) return <p className="error-text">{error}</p>;
  if (!form) return <p className="dim">Loading…</p>;

  return (
    <>
      <div className="row spread">
        <div>
          <h1>{editName ? `Edit agent: ${editName}` : 'New agent'}</h1>
          <p className="subtitle">
            An agent is a flat <span className="mono">.md</span> file — frontmatter that routes
            delegation, and a body that is its system prompt.
          </p>
        </div>
        <Link className="btn" href="/agents">
          ← All agents
        </Link>
      </div>

      <div className="card">
        <label className="field">
          <span>Name — kebab-case, becomes the filename and the subagent type</span>
          <input
            value={form.name}
            placeholder="e.g. release-notes-writer"
            disabled={Boolean(editName)}
            spellCheck={false}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
      </div>

      <div className="card">
        <div className="row spread" style={{ marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-dim)' }}>
            Description — drives when this agent gets delegated to
          </span>
          <DescriptionCounter length={form.description.trim().length} />
        </div>
        <textarea
          className="editor"
          style={{ minHeight: 120 }}
          value={form.description}
          spellCheck={false}
          placeholder="Third person. What the agent does AND when to use it, with concrete trigger phrases."
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="card">
        <div className="row">
          <label className="field grow">
            <span>tools — comma/space separated (empty = inherit all)</span>
            <input
              value={form.tools ?? ''}
              placeholder="e.g. Read, Grep, Glob, Bash"
              spellCheck={false}
              onChange={(e) => setForm({ ...form, tools: e.target.value || undefined })}
            />
          </label>
          <label className="field">
            <span>model (optional)</span>
            <input
              value={form.model ?? ''}
              placeholder="inherit"
              spellCheck={false}
              onChange={(e) => setForm({ ...form, model: e.target.value || undefined })}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-dim)' }}>
          Body — the agent's system prompt
        </span>
        <textarea
          className="editor"
          style={{ minHeight: 320, marginTop: 6 }}
          value={form.body}
          spellCheck={false}
          placeholder={'# Role\n\nYou are…'}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
      </div>

      <div className="row" style={{ margin: '20px 0' }}>
        <button className="primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : editName ? 'Save changes' : 'Create agent'}
        </button>
        {savedNote && <span className="save-note">Saved ✓</span>}
        {error && <span className="error-text">{error}</span>}
      </div>
      {warnings.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--running)' }}>
          <h3 style={{ color: 'var(--running)' }}>Saved with warnings</h3>
          <ul className="dim" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default function AgentEditPage() {
  return (
    <Suspense fallback={<p className="dim">Loading…</p>}>
      <EditorInner />
    </Suspense>
  );
}
