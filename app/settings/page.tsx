'use client';

import { useCallback, useEffect, useState } from 'react';

interface ProviderKeyState {
  key: string;
  label: string;
  envVar: string;
  configured: boolean;
  last4: string | null;
  setAt: string | null;
}

function KeyCard({ provider, onChanged }: { provider: ProviderKeyState; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.key, key: value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setValue('');
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await fetch(`/api/settings?provider=${encodeURIComponent(provider.key)}`, {
        method: 'DELETE',
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="row spread">
        <h3>{provider.label}</h3>
        {provider.configured ? (
          <span className="badge pass">configured</span>
        ) : (
          <span className="badge">no key</span>
        )}
      </div>
      <p className="dim" style={{ margin: '4px 0 10px', fontSize: 13 }}>
        Injected into eval runs as <span className="mono">{provider.envVar}</span>
      </p>

      {provider.configured && !editing && (
        <div className="row spread">
          <span className="mono">
            ••••••••{provider.last4}
            <span className="dim" style={{ marginLeft: 10, fontFamily: 'inherit' }}>
              set {provider.setAt ? new Date(provider.setAt).toLocaleDateString() : ''}
            </span>
          </span>
          <span className="row">
            <button onClick={() => setEditing(true)} disabled={busy}>
              Replace
            </button>
            <button onClick={remove} disabled={busy}>
              Remove
            </button>
          </span>
        </div>
      )}

      {(!provider.configured || editing) && (
        <div className="row">
          <label className="field grow">
            <span>API key</span>
            <input
              type="password"
              value={value}
              placeholder={`${provider.label} API key`}
              autoComplete="off"
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <span className="row" style={{ paddingTop: 18 }}>
            <button className="primary" onClick={save} disabled={busy || !value.trim()}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(false);
                  setValue('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            )}
          </span>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function SkillsDirCard({
  current,
  onChanged,
}: {
  current: string | null;
  onChanged: () => void;
}) {
  const [value, setValue] = useState(current ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => setValue(current ?? ''), [current]);

  async function save(dir: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsDir: dir }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setNote(dir ? 'Saved ✓' : 'Cleared ✓');
      setTimeout(() => setNote(null), 2500);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Skills directory</h3>
      <p className="dim" style={{ margin: '4px 0 10px', fontSize: 13 }}>
        Absolute path to the folder your Agent Skills live in — each skill is a subdirectory
        containing a <span className="mono">SKILL.md</span>. Powers the Skills tool.
      </p>
      <div className="row">
        <label className="field grow">
          <span>Path</span>
          <input
            value={value}
            placeholder="/Users/cference/Code/claude-toolkit/skills"
            spellCheck={false}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <span className="row" style={{ paddingTop: 18 }}>
          <button className="primary" onClick={() => save(value)} disabled={busy || !value.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          {current && (
            <button onClick={() => save('')} disabled={busy}>
              Clear
            </button>
          )}
        </span>
      </div>
      {note && <p className="save-note">{note}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderKeyState[] | null>(null);
  const [skillsDir, setSkillsDir] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((b) => {
        if (b.error) {
          setError(b.error);
          return;
        }
        setProviders(b.providers);
        setSkillsDir(b.skillsDir ?? null);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(load, [load]);

  return (
    <>
      <h1>Settings</h1>
      <p className="subtitle">System configuration for AI Toolkit UI.</p>

      <h2>Provider API keys</h2>
      <p className="dim" style={{ marginTop: -6 }}>
        Keys unlock the direct API providers in the eval builder. They're stored in{' '}
        <span className="mono">~/.ai-toolkit-ui/settings.json</span> (owner-only permissions),
        outside your project and git — and are only ever used as environment variables for eval
        runs you start.
      </p>

      {error && <p className="error-text">{error}</p>}
      {!providers && !error && <p className="dim">Loading…</p>}
      {providers?.map((p) => <KeyCard provider={p} key={p.key} onChanged={load} />)}

      <h2>Skills</h2>
      <SkillsDirCard current={skillsDir} onChanged={load} />
    </>
  );
}
