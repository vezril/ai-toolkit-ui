'use client';

import { useEffect, useState } from 'react';

export default function FileEditor({ path }: { path: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContent(null);
    setDirty(false);
    setNote(null);
    setError(null);
    fetch(`/api/file?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((b) => (b.error ? setError(b.error) : setContent(b.content)))
      .catch((e) => setError(String(e)));
  }, [path]);

  async function save() {
    if (content === null) return;
    setSaving(true);
    setNote(null);
    setError(null);
    try {
      const res = await fetch('/api/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setDirty(false);
      setNote('Saved ✓');
      setTimeout(() => setNote(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="error-text">{error}</p>;
  if (content === null) return <p className="dim">Loading {path}…</p>;

  return (
    <div>
      <div className="row spread" style={{ marginBottom: 8 }}>
        <span className="mono dim">{path}</span>
        <span className="row">
          {note && <span className="save-note">{note}</span>}
          <button className="primary" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </span>
      </div>
      <textarea
        className="editor"
        value={content}
        spellCheck={false}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
      />
    </div>
  );
}
