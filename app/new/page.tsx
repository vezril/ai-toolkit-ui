'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { CheckDraft, EvalDraft, RunnerInfo, TestDraft } from '@/lib/evals';

const EXAMPLE_PROMPT = `You are an expert Product Owner.

Write a PRD for the provided requirements.

Output ONLY the PRD content, no additional text.

Here's the request:
{{request}}`;

const EXAMPLE_TEST: TestDraft = {
  description: 'PRD covers the basics',
  request:
    'I want to extend an existing pomodoro app to ring with a customizable chime when the timer expires.',
  checks: [
    { kind: 'contains', text: 'requirement', ignoreCase: true },
    {
      kind: 'rubric',
      criterion: 'The PRD includes functional requirements covering the core functionality',
      metric: 'functional-requirements',
      threshold: 0.7,
      weight: 2,
    },
  ],
};

function emptyTest(): TestDraft {
  return { description: '', request: '', checks: [{ kind: 'contains', text: '', ignoreCase: true }] };
}

function CheckEditor({
  check,
  onChange,
  onRemove,
}: {
  check: CheckDraft;
  onChange: (c: CheckDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="check-row">
      <div className="row spread">
        <span className="badge">{check.kind === 'contains' ? 'Text check' : 'AI judge'}</span>
        <button className="link-btn" onClick={onRemove} title="Remove this check">
          ✕
        </button>
      </div>
      {check.kind === 'contains' ? (
        <div className="row" style={{ marginTop: 6 }}>
          <label className="field grow">
            <span>Response must contain</span>
            <input
              value={check.text}
              placeholder="e.g. requirement"
              onChange={(e) => onChange({ ...check, text: e.target.value })}
            />
          </label>
          <label className="field checkbox">
            <input
              type="checkbox"
              checked={check.ignoreCase}
              onChange={(e) => onChange({ ...check, ignoreCase: e.target.checked })}
            />
            <span>Ignore case</span>
          </label>
        </div>
      ) : (
        <>
          <label className="field" style={{ marginTop: 6 }}>
            <span>What should the judge verify? (an observable statement)</span>
            <input
              value={check.criterion}
              placeholder="e.g. The response includes at least one working code example"
              onChange={(e) => onChange({ ...check, criterion: e.target.value })}
            />
          </label>
          <div className="row" style={{ marginTop: 6 }}>
            <label className="field">
              <span>Label (shown in results)</span>
              <input
                value={check.metric ?? ''}
                placeholder="e.g. code-example"
                onChange={(e) => onChange({ ...check, metric: e.target.value })}
              />
            </label>
            <label className="field narrow">
              <span>Pass bar (0–1)</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={check.threshold}
                onChange={(e) => onChange({ ...check, threshold: Number(e.target.value) })}
              />
            </label>
            <label className="field narrow">
              <span>Importance ×</span>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={check.weight}
                onChange={(e) => onChange({ ...check, weight: Number(e.target.value) })}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function TestEditor({
  test,
  index,
  onChange,
  onRemove,
}: {
  test: TestDraft;
  index: number;
  onChange: (t: TestDraft) => void;
  onRemove: () => void;
}) {
  function setCheck(i: number, c: CheckDraft) {
    onChange({ ...test, checks: test.checks.map((old, j) => (j === i ? c : old)) });
  }
  return (
    <div className="card">
      <div className="row spread">
        <h3>Test case {index + 1}</h3>
        <button className="link-btn" onClick={onRemove}>
          ✕ remove
        </button>
      </div>
      <label className="field">
        <span>Name (optional)</span>
        <input
          value={test.description ?? ''}
          placeholder="e.g. Handles a vague feature request"
          onChange={(e) => onChange({ ...test, description: e.target.value })}
        />
      </label>
      <label className="field" style={{ marginTop: 8 }}>
        <span>Example input — what a user would ask</span>
        <textarea
          rows={3}
          value={test.request}
          placeholder="e.g. I want to extend my pomodoro app with customizable chimes…"
          onChange={(e) => onChange({ ...test, request: e.target.value })}
        />
      </label>
      <div style={{ marginTop: 10 }}>
        <span className="dim" style={{ fontSize: 13 }}>
          Checks — every check must pass for this test to pass
        </span>
        {test.checks.map((c, i) => (
          <CheckEditor
            key={i}
            check={c}
            onChange={(nc) => setCheck(i, nc)}
            onRemove={() => onChange({ ...test, checks: test.checks.filter((_, j) => j !== i) })}
          />
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <button
            onClick={() =>
              onChange({
                ...test,
                checks: [...test.checks, { kind: 'contains', text: '', ignoreCase: true }],
              })
            }
          >
            + Text check
          </button>
          <button
            onClick={() =>
              onChange({
                ...test,
                checks: [
                  ...test.checks,
                  { kind: 'rubric', criterion: '', metric: '', threshold: 0.7, weight: 1 },
                ],
              })
            }
          >
            + AI judge check
          </button>
        </div>
      </div>
    </div>
  );
}

function BuilderInner() {
  const router = useRouter();
  const editConfig = useSearchParams().get('config');

  const [runners, setRunners] = useState<RunnerInfo[]>([]);
  const [draft, setDraft] = useState<EvalDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const url = editConfig ? `/api/evals?config=${encodeURIComponent(editConfig)}` : '/api/evals';
    fetch(url)
      .then((r) => r.json())
      .then((b) => {
        if (b.error) {
          setError(b.error);
          return;
        }
        setRunners(b.runners);
        setDraft(
          b.draft ?? {
            name: '',
            prompt: '',
            models: b.runners.map((r: RunnerInfo) => ({
              runner: r.key,
              model: r.defaultModel,
              enabled: r.key === 'devin',
            })),
            judge: 'devin',
            tests: [emptyTest()],
          },
        );
      })
      .catch((e) => setError(String(e)));
  }, [editConfig]);

  async function save(runAfter: boolean) {
    if (!draft) return;
    setBusy(runAfter ? 'run' : 'save');
    setError(null);
    try {
      const res = await fetch('/api/evals', {
        method: editConfig ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (runAfter) {
        const runRes = await fetch('/api/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: body.configPath }),
        });
        const runBody = await runRes.json();
        if (!runRes.ok) throw new Error(runBody.error ?? `HTTP ${runRes.status}`);
        router.push(`/runs/${runBody.run.id}`);
      } else {
        router.push(`/config?file=${encodeURIComponent(body.configPath)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  if (error && !draft) return <p className="error-text">{error}</p>;
  if (!draft) return <p className="dim">Loading…</p>;

  function setModel(runnerKey: string, patch: Partial<EvalDraft['models'][number]>) {
    setDraft({
      ...draft!,
      models: draft!.models.map((m) => (m.runner === runnerKey ? { ...m, ...patch } : m)),
    });
  }

  return (
    <>
      <h1>{editConfig ? 'Edit evaluation' : 'New evaluation'}</h1>
      <p className="subtitle">
        Describe the prompt, add example inputs with checks, pick the models — the promptfoo
        YAML is generated for you.
      </p>

      <h2>1 · Name</h2>
      <div className="card">
        <label className="field">
          <span>What are you evaluating?</span>
          <input
            value={draft.name}
            placeholder="e.g. PRD generator"
            disabled={Boolean(editConfig)}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
      </div>

      <h2>2 · Prompt under test</h2>
      <div className="card">
        <div className="row spread" style={{ marginBottom: 6 }}>
          <span className="dim" style={{ fontSize: 13 }}>
            Write <code>{'{{request}}'}</code> where each test's example input should go — added
            to the end automatically if you leave it out.
          </span>
          {!draft.prompt && (
            <button className="link-btn" onClick={() => setDraft({ ...draft, prompt: EXAMPLE_PROMPT })}>
              Insert example prompt
            </button>
          )}
        </div>
        <textarea
          className="editor"
          style={{ minHeight: 220 }}
          value={draft.prompt}
          placeholder={EXAMPLE_PROMPT}
          spellCheck={false}
          onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
        />
      </div>

      <h2>3 · Models</h2>
      <p className="dim" style={{ marginTop: -6 }}>
        Every model that's on answers all test cases, so you can compare them side by side.
      </p>
      <div className="model-grid">
        {runners.map((r) => {
          const m = draft.models.find((m) => m.runner === r.key)!;
          return (
            <div className={`card model-card ${m.enabled ? 'on' : ''}`} key={r.key}>
              <div className="row spread">
                <h3>{r.name}</h3>
                <label className="switch" title={m.enabled ? 'On' : 'Off'}>
                  <input
                    type="checkbox"
                    checked={m.enabled}
                    onChange={(e) => setModel(r.key, { enabled: e.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </div>
              {!r.available && (
                <p className="dim" style={{ fontSize: 12, margin: '2px 0' }}>
                  ⚠ runner script not found in project
                </p>
              )}
              <label className="field">
                <span>Model</span>
                <input
                  list={`models-${r.key}`}
                  value={m.model}
                  disabled={!m.enabled}
                  onChange={(e) => setModel(r.key, { model: e.target.value })}
                />
                <datalist id={`models-${r.key}`}>
                  {r.models.map((name) => (
                    <option value={name} key={name} />
                  ))}
                </datalist>
              </label>
              <label className="field" style={{ marginTop: 6 }}>
                <span>Max tokens (optional)</span>
                <input
                  type="number"
                  min={1}
                  placeholder="runner default"
                  value={m.maxTokens ?? ''}
                  disabled={!m.enabled}
                  onChange={(e) =>
                    setModel(r.key, {
                      maxTokens: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </label>
            </div>
          );
        })}
      </div>
      <div className="card">
        <label className="field">
          <span>Judge — grades the "AI judge" checks</span>
          <select
            value={draft.judge}
            onChange={(e) => setDraft({ ...draft, judge: e.target.value })}
          >
            {runners.map((r) => (
              <option value={r.key} key={r.key}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2>4 · Test cases</h2>
      {draft.tests.map((t, i) => (
        <TestEditor
          key={i}
          test={t}
          index={i}
          onChange={(nt) => setDraft({ ...draft, tests: draft.tests.map((o, j) => (j === i ? nt : o)) })}
          onRemove={() => setDraft({ ...draft, tests: draft.tests.filter((_, j) => j !== i) })}
        />
      ))}
      <div className="row">
        <button onClick={() => setDraft({ ...draft, tests: [...draft.tests, emptyTest()] })}>
          + Add test case
        </button>
        <button
          onClick={() =>
            setDraft({ ...draft, tests: [...draft.tests, structuredClone(EXAMPLE_TEST)] })
          }
        >
          + Insert example test case
        </button>
      </div>

      <div className="row" style={{ margin: '24px 0' }}>
        <button className="primary" onClick={() => save(true)} disabled={busy !== null}>
          {busy === 'run' ? 'Starting…' : '▶ Save & run test'}
        </button>
        <button onClick={() => save(false)} disabled={busy !== null}>
          {busy === 'save' ? 'Saving…' : 'Save'}
        </button>
        {error && <span className="error-text">{error}</span>}
      </div>
    </>
  );
}

export default function NewEvalPage() {
  return (
    <Suspense fallback={<p className="dim">Loading…</p>}>
      <BuilderInner />
    </Suspense>
  );
}
