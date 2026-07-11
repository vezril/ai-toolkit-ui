'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import HistoryPanel from '../../components/HistoryPanel';
import type { SkillHealth, SkillForm } from '@/lib/skills';
import type { SkillFix } from '@/lib/skillFixes';

function FixRow({
  fix,
  disabled,
  onApply,
}: {
  fix: SkillFix;
  disabled: boolean;
  onApply: (fixId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="check-row">
      <div className="row spread">
        <span>
          <b>{fix.finding}</b>
          <span className="dim" style={{ marginLeft: 8, fontSize: 13 }}>{fix.action}</span>
        </span>
        <button className="link-btn" onClick={() => setOpen(!open)}>
          {open ? 'Hide diff' : 'Fix…'}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 8 }}>
          <div className="output-block" style={{ maxHeight: 160 }}>
            {fix.changes.map((c, i) => (
              <div key={i}>
                {c.before !== null && (
                  <div style={{ color: 'var(--fail)' }}>
                    − {c.line}: {c.before}
                  </div>
                )}
                <div style={{ color: 'var(--pass)' }}>
                  + {c.line}: {c.after}
                </div>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="primary"
              disabled={busy || disabled}
              title={disabled ? 'Save or discard your edits first — applying reloads the editor' : undefined}
              onClick={async () => {
                setBusy(true);
                try {
                  await onApply(fix.fixId);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthPanel({
  name,
  health,
  fixes,
  contentHash,
  formDirty,
  onApplied,
  onError,
}: {
  name: string;
  health: SkillHealth;
  fixes: SkillFix[];
  contentHash: string;
  formDirty: boolean;
  onApplied: () => void;
  onError: (msg: string) => void;
}) {
  // A finding is covered by a fix when its message matches the fix's concern.
  const coveredBy = (message: string) =>
    fixes.some((f) => {
      if (f.fixId === 'quote-frontmatter') return message.includes('does not parse');
      if (f.fixId === 'sync-name') return message.includes('must equal the directory name');
      const link = f.fixId.match(/^link-(?:replace|unwrap):(.+)$/)?.[1];
      return link ? message.includes(`[[${link}]]`) : false;
    });
  const plain = [
    ...health.errors.map((m) => ({ m, kind: 'error' })),
    ...health.warnings.map((m) => ({ m, kind: 'warning' })),
  ].filter(({ m }) => !coveredBy(m));

  if (health.errors.length + health.warnings.length === 0 && fixes.length === 0) return null;

  async function apply(fixId: string) {
    const res = await fetch('/api/skills/fixes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, fixId, contentHash }),
    });
    const body = await res.json();
    if (!res.ok) {
      onError(body.error ?? `HTTP ${res.status}`);
      return;
    }
    onApplied();
  }

  return (
    <div className="card" style={{ borderColor: 'var(--running)' }}>
      <h3 style={{ color: 'var(--running)' }}>Health</h3>
      {fixes.map((f) => (
        <FixRow fix={f} key={f.fixId} disabled={formDirty} onApply={apply} />
      ))}
      {plain.length > 0 && (
        <ul className="dim" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          {plain.map(({ m, kind }, i) => (
            <li key={i} style={kind === 'error' ? { color: 'var(--fail)' } : undefined}>
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const DESC_BAND_MIN = 200;
const DESC_BAND_MAX = 1500;
const DESC_STANDARD_CAP = 1024;

function DescriptionCounter({ length }: { length: number }) {
  let color = 'var(--pass)';
  let note = 'in the recommended band';
  if (length < DESC_BAND_MIN) {
    color = 'var(--fail)';
    note = `below the recommended ${DESC_BAND_MIN}-char minimum — short descriptions under-trigger`;
  } else if (length > DESC_BAND_MAX) {
    color = 'var(--fail)';
    note = `above the recommended ${DESC_BAND_MAX}-char maximum — the description is always in context`;
  } else if (length > DESC_STANDARD_CAP) {
    color = 'var(--running)';
    note = `over the ${DESC_STANDARD_CAP}-char Agent Skills standard cap (fine for Claude Code, may not port)`;
  }
  return (
    <span style={{ fontSize: 12.5, color }}>
      {length} chars — {note}
    </span>
  );
}

type EvalStatus = 'none' | 'current' | 'stale' | 'conflict';

function SkillEvalButton({ name, status, onAction }: { name: string; status: EvalStatus; onAction: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createOrSync(openAfter: boolean, ab = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/skills/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ab }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (openAfter) router.push(`/new?config=${encodeURIComponent(body.configPath)}`);
      else onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (status === 'conflict') {
    return (
      <span className="dim" style={{ fontSize: 13 }}>
        ⚠ a hand-written eval occupies <span className="mono">skill-{name}</span>
      </span>
    );
  }
  return (
    <span className="row">
      {status === 'none' && (
        <>
          <button onClick={() => createOrSync(true)} disabled={busy}>
            {busy ? 'Creating…' : '⚗ Create EDD eval'}
          </button>
          <button
            onClick={() => createOrSync(true, true)}
            disabled={busy}
            title="Blind A/B: with-skill vs a plain baseline — every test runs twice, judge picks the winner"
          >
            {busy ? 'Creating…' : '⚖ Create A/B eval'}
          </button>
        </>
      )}
      {status === 'stale' && (
        <button onClick={() => createOrSync(false)} disabled={busy} title="The skill changed since the eval's prompt was last generated">
          {busy ? 'Syncing…' : '⚠ Sync skill → eval'}
        </button>
      )}
      {(status === 'current' || status === 'stale') && (
        <Link className="btn" href={`/new?config=${encodeURIComponent(`evals/skill-${name}.config.yaml`)}`}>
          Open EDD eval →
        </Link>
      )}
      {error && <span className="error-text">{error}</span>}
    </span>
  );
}

function EditorInner() {
  const router = useRouter();
  const editName = useSearchParams().get('name');

  const [form, setForm] = useState<SkillForm | null>(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState<string>('');
  const [health, setHealth] = useState<SkillHealth | null>(null);
  const [fixes, setFixes] = useState<SkillFix[]>([]);
  const [contentHash, setContentHash] = useState('');
  const [evalStatus, setEvalStatus] = useState<EvalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  const formDirty = form !== null && JSON.stringify(form) !== loadedSnapshot;

  function loadEvalStatus(name: string) {
    fetch(`/api/skills/eval?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((b) => setEvalStatus(b.status ?? null))
      .catch(() => {});
  }

  function loadSkill(name: string) {
    fetch(`/api/skills?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((b) => {
        if (b.error) {
          setError(b.error);
          return;
        }
        setForm(b.skill);
        setLoadedSnapshot(JSON.stringify(b.skill));
        setHealth(b.health ?? null);
      })
      .catch((e) => setError(String(e)));
    fetch(`/api/skills/fixes?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((b) => {
        if (!b.error) {
          setFixes(b.fixes ?? []);
          setContentHash(b.contentHash ?? '');
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!editName) {
      const empty = { name: '', description: '', body: '' };
      setForm(empty);
      setLoadedSnapshot(JSON.stringify(empty));
      return;
    }
    loadSkill(editName);
    loadEvalStatus(editName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editName]);

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    setWarnings([]);
    setSavedNote(false);
    try {
      const res = await fetch('/api/skills', {
        method: editName ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setWarnings(body.warnings ?? []);
      setSavedNote(true);
      setLoadedSnapshot(JSON.stringify(form));
      if (!editName) {
        // Stay reachable for further edits under the now-fixed name.
        router.replace(`/skills/edit?name=${encodeURIComponent(form.name)}`);
      } else {
        loadSkill(editName); // refresh health/fixes/hash
        loadEvalStatus(editName); // a save may have made the linked eval stale
      }
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
          <h1>{editName ? `Edit skill: ${editName}` : 'New skill'}</h1>
          <p className="subtitle">
            A skill is a folder with a <span className="mono">SKILL.md</span> — frontmatter that
            tells Claude when to use it, and a body it reads once triggered.
          </p>
        </div>
        <Link className="btn" href="/skills">
          ← All skills
        </Link>
      </div>

      {editName && health && (
        <HealthPanel
          name={editName}
          health={health}
          fixes={fixes}
          contentHash={contentHash}
          formDirty={formDirty}
          onApplied={() => {
            setError(null);
            loadSkill(editName);
          }}
          onError={(msg) => {
            setError(msg);
            loadSkill(editName); // stale preview — refresh hash and fixes
          }}
        />
      )}

      <div className="card">
        <label className="field">
          <span>Name — kebab-case, becomes the directory and the /command</span>
          <input
            value={form.name}
            placeholder="e.g. release-notes"
            disabled={Boolean(editName)}
            spellCheck={false}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
      </div>

      <div className="card">
        <div className="row spread" style={{ marginBottom: 6 }}>
          <span className="field" style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-dim)' }}>
            Description — always in context; it alone decides when the skill triggers
          </span>
          <DescriptionCounter length={form.description.trim().length} />
        </div>
        <textarea
          className="editor"
          style={{ minHeight: 120 }}
          value={form.description}
          spellCheck={false}
          placeholder={`Write in third person. Say what the skill covers AND when to use it, with concrete trigger phrases.\ne.g. "Test-Driven Development discipline — strict Red-Green-Refactor… Use whenever adding or changing behavior in code, when the user asks to 'write tests', 'do TDD', or work 'test-first'…"`}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="card">
        <span className="field" style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-dim)' }}>
          Body — loaded only when the skill triggers; link sibling skills with [[skill-name]]
        </span>
        <textarea
          className="editor"
          style={{ minHeight: 320, marginTop: 6 }}
          value={form.body}
          spellCheck={false}
          placeholder={'# My Skill\n\nThe playbook Claude follows when this skill fires…'}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
      </div>

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Advanced frontmatter</summary>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field checkbox">
            <input
              type="checkbox"
              checked={form.disableModelInvocation ?? false}
              onChange={(e) =>
                setForm({ ...form, disableModelInvocation: e.target.checked || undefined })
              }
            />
            <span>Manual-only (disable-model-invocation) — Claude never auto-triggers it</span>
          </label>
          <label className="field checkbox">
            <input
              type="checkbox"
              checked={form.userInvocable === false}
              onChange={(e) =>
                setForm({ ...form, userInvocable: e.target.checked ? false : undefined })
              }
            />
            <span>Hide from the / menu (user-invocable: false)</span>
          </label>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field grow">
            <span>allowed-tools — tools usable without asking while active</span>
            <input
              value={form.allowedTools ?? ''}
              placeholder="e.g. Read Grep Glob"
              spellCheck={false}
              onChange={(e) => setForm({ ...form, allowedTools: e.target.value || undefined })}
            />
          </label>
          <label className="field grow">
            <span>argument-hint — shown after /name in the menu</span>
            <input
              value={form.argumentHint ?? ''}
              placeholder="e.g. <issue-number>"
              spellCheck={false}
              onChange={(e) => setForm({ ...form, argumentHint: e.target.value || undefined })}
            />
          </label>
        </div>
      </details>

      <div className="row spread" style={{ margin: '20px 0' }}>
        <span className="row">
          <button className="primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : editName ? 'Save changes' : 'Create skill'}
          </button>
          {savedNote && <span className="save-note">Saved ✓</span>}
          {error && <span className="error-text">{error}</span>}
        </span>
        {editName && evalStatus && (
          <SkillEvalButton
            name={editName}
            status={evalStatus}
            onAction={() => loadEvalStatus(editName)}
          />
        )}
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
      {editName && <HistoryPanel type="skill" name={editName} onRestored={() => loadSkill(editName)} />}
    </>
  );
}

export default function SkillEditPage() {
  return (
    <Suspense fallback={<p className="dim">Loading…</p>}>
      <EditorInner />
    </Suspense>
  );
}
