'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { WorkflowDetail, WorkflowModel, WorkflowPhase, WorkflowStep } from '@/lib/workflows';

const NODE_W = 300;
const NODE_H = 62;
const GAP = 42;
const CHAIN_X = 40;

interface CanvasNode {
  title: string;
  detail?: string;
}

/** Hand-rolled SVG: a vertical chain of nodes, optional dashed composition side-nodes. */
function WorkflowCanvas({
  nodes,
  compositions,
  selected,
  onSelect,
}: {
  nodes: CanvasNode[];
  compositions: string[];
  selected?: number;
  onSelect?: (i: number) => void;
}) {
  const height = Math.max(nodes.length, 1) * (NODE_H + GAP) + GAP;
  const width = compositions.length > 0 ? 640 : 400;
  const nodeY = (i: number) => GAP + i * (NODE_H + GAP);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: width, display: 'block' }}
      role="img"
      aria-label="Workflow step graph"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--text-dim)" />
        </marker>
      </defs>

      {nodes.map((n, i) => (
        <g key={i} onClick={() => onSelect?.(i)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
          {i > 0 && (
            <line
              x1={CHAIN_X + NODE_W / 2}
              y1={nodeY(i - 1) + NODE_H}
              x2={CHAIN_X + NODE_W / 2}
              y2={nodeY(i) - 4}
              stroke="var(--text-dim)"
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
            />
          )}
          <rect
            x={CHAIN_X}
            y={nodeY(i)}
            width={NODE_W}
            height={NODE_H}
            rx={10}
            fill="var(--surface)"
            stroke={selected === i ? 'var(--accent)' : 'var(--border)'}
            strokeWidth={selected === i ? 2.5 : 1.5}
          />
          <text x={CHAIN_X + 14} y={nodeY(i) + 25} fill="var(--text)" fontSize={14} fontWeight={600}>
            {`${i + 1}. ${n.title}`.slice(0, 36)}
          </text>
          {n.detail && (
            <text x={CHAIN_X + 14} y={nodeY(i) + 45} fill="var(--text-dim)" fontSize={11.5}>
              {n.detail.slice(0, 44)}
            </text>
          )}
        </g>
      ))}

      {compositions.map((c, j) => {
        const cy = GAP + j * (NODE_H + GAP) + NODE_H / 2;
        return (
          <g key={c}>
            <line
              x1={CHAIN_X + NODE_W}
              y1={Math.min(cy, height / 2)}
              x2={width - 190}
              y2={cy}
              stroke="var(--text-dim)"
              strokeWidth={1.5}
              strokeDasharray="6 5"
              markerEnd="url(#arrow)"
            />
            <rect x={width - 186} y={cy - 22} width={170} height={44} rx={22} fill="var(--surface-2)" stroke="var(--border)" strokeDasharray="6 5" />
            <text x={width - 101} y={cy + 4} fill="var(--text-dim)" fontSize={12} textAnchor="middle">
              {c.slice(0, 22)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function emptyStep(): WorkflowStep {
  return { title: '', instructions: '' };
}

function EditorInner() {
  const router = useRouter();
  const editName = useSearchParams().get('name');

  const [detail, setDetail] = useState<WorkflowDetail | null>(null);
  const [model, setModel] = useState<WorkflowModel | null>(null);
  const [selected, setSelected] = useState(0);
  const [skillNames, setSkillNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((b) => setSkillNames((b.skills ?? []).map((s: { name: string }) => s.name)))
      .catch(() => {});
    if (!editName) {
      setModel({ name: '', description: '', steps: [emptyStep()] });
      return;
    }
    fetch(`/api/workflows?name=${encodeURIComponent(editName)}`)
      .then((r) => r.json())
      .then((b) => {
        if (b.error) {
          setError(b.error);
          return;
        }
        setDetail(b.workflow);
        if (b.workflow.generated && b.workflow.model) setModel(b.workflow.model);
      })
      .catch((e) => setError(String(e)));
  }, [editName]);

  async function save() {
    if (!model) return;
    setBusy(true);
    setError(null);
    setSavedNote(false);
    try {
      const res = await fetch('/api/workflows', {
        method: editName ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setSavedNote(true);
      if (!editName) router.replace(`/workflows/edit?name=${encodeURIComponent(model.name)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !model && !detail) return <p className="error-text">{error}</p>;

  // ---- VIEW MODE: hand-written workflow, phases + composition edges, read-only ----
  if (editName && detail && !detail.generated) {
    const nodes: CanvasNode[] = detail.phases.map((p: WorkflowPhase) => ({ title: p.title, detail: p.detail }));
    return (
      <>
        <div className="row spread">
          <div>
            <h1>{detail.name}</h1>
            <p className="subtitle">{detail.description}</p>
          </div>
          <Link className="btn" href="/workflows">← All workflows</Link>
        </div>
        <p className="dim" style={{ fontSize: 13 }}>
          Hand-written script — visualized from its declared <span className="mono">meta.phases</span>
          {detail.compositions.length > 0 && <> · dashed nodes are workflows it invokes</>}. Structure
          is edited in the file, not here.
        </p>
        <div className="card">
          <WorkflowCanvas nodes={nodes} compositions={detail.compositions} />
        </div>
      </>
    );
  }

  if (!model) return <p className="dim">Loading…</p>;

  // ---- BUILD MODE ----
  const step = model.steps[selected];
  const setStep = (patch: Partial<WorkflowStep>) =>
    setModel({
      ...model,
      steps: model.steps.map((s, i) => (i === selected ? { ...s, ...patch } : s)),
    });
  const move = (dir: -1 | 1) => {
    const j = selected + dir;
    if (j < 0 || j >= model.steps.length) return;
    const steps = [...model.steps];
    [steps[selected], steps[j]] = [steps[j], steps[selected]];
    setModel({ ...model, steps });
    setSelected(j);
  };

  const nodes: CanvasNode[] = model.steps.map((s) => ({
    title: s.title || '(untitled)',
    detail: s.skill ? `⬡ ${s.skill}` : s.instructions,
  }));

  return (
    <>
      <div className="row spread">
        <div>
          <h1>{editName ? `Edit workflow: ${editName}` : 'New workflow'}</h1>
          <p className="subtitle">
            Sequential steps, each optionally wiring in a skill. Saving generates a runnable
            Claude Code workflow script in both managed locations.
          </p>
        </div>
        <Link className="btn" href="/workflows">← All workflows</Link>
      </div>

      <div className="card">
        <div className="row">
          <label className="field grow">
            <span>Name — kebab-case, becomes the script filename and /workflow name</span>
            <input
              value={model.name}
              disabled={Boolean(editName)}
              placeholder="e.g. triage-and-fix"
              spellCheck={false}
              onChange={(e) => setModel({ ...model, name: e.target.value })}
            />
          </label>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="field grow">
            <span>Description</span>
            <input
              value={model.description}
              placeholder="One line: what this workflow does"
              onChange={(e) => setModel({ ...model, description: e.target.value })}
            />
          </label>
          <label className="field grow">
            <span>When to use (optional)</span>
            <input
              value={model.whenToUse ?? ''}
              onChange={(e) => setModel({ ...model, whenToUse: e.target.value || undefined })}
            />
          </label>
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', gap: 18 }}>
        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <WorkflowCanvas nodes={nodes} compositions={[]} selected={selected} onSelect={setSelected} />
          <button
            onClick={() => {
              setModel({ ...model, steps: [...model.steps, emptyStep()] });
              setSelected(model.steps.length);
            }}
          >
            + Add step
          </button>
        </div>

        {step && (
          <div className="card" style={{ width: 380, flexShrink: 0 }}>
            <div className="row spread">
              <h3>Step {selected + 1}</h3>
              <span className="row" style={{ gap: 4 }}>
                <button className="link-btn" onClick={() => move(-1)} disabled={selected === 0}>↑</button>
                <button className="link-btn" onClick={() => move(1)} disabled={selected === model.steps.length - 1}>↓</button>
                <button
                  className="link-btn"
                  disabled={model.steps.length === 1}
                  onClick={() => {
                    setModel({ ...model, steps: model.steps.filter((_, i) => i !== selected) });
                    setSelected(Math.max(0, selected - 1));
                  }}
                >
                  ✕
                </button>
              </span>
            </div>
            <label className="field">
              <span>Title — becomes the phase name</span>
              <input value={step.title} placeholder="e.g. Write the PRD" onChange={(e) => setStep({ title: e.target.value })} />
            </label>
            <label className="field" style={{ marginTop: 8 }}>
              <span>Instructions — the step's task for its agent</span>
              <textarea
                className="editor"
                style={{ minHeight: 140 }}
                value={step.instructions}
                spellCheck={false}
                onChange={(e) => setStep({ instructions: e.target.value })}
              />
            </label>
            <label className="field" style={{ marginTop: 8 }}>
              <span>Wired skill (optional) — referenced by name + description in the prompt</span>
              <input
                list="skill-names"
                value={step.skill ?? ''}
                placeholder="e.g. requirements-engineering"
                spellCheck={false}
                onChange={(e) => setStep({ skill: e.target.value || undefined })}
              />
              <datalist id="skill-names">
                {skillNames.map((n) => (
                  <option value={n} key={n} />
                ))}
              </datalist>
            </label>
          </div>
        )}
      </div>

      <div className="row" style={{ margin: '20px 0' }}>
        <button className="primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : editName ? 'Save workflow' : 'Create workflow'}
        </button>
        {savedNote && <span className="save-note">Saved to both locations ✓</span>}
        {error && <span className="error-text">{error}</span>}
      </div>
    </>
  );
}

export default function WorkflowEditPage() {
  return (
    <Suspense fallback={<p className="dim">Loading…</p>}>
      <EditorInner />
    </Suspense>
  );
}
