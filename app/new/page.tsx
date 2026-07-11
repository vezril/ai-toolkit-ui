'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { coachFindings, type CoachCheck } from '@/lib/coach';
import type { ApiProviderOption, CheckDraft, EvalDraft, RunnerInfo, TestDraft } from '@/lib/evals';

// Module-level stash for the guided-setup handoff: StrictMode double-invokes
// effects in dev, so a read-and-delete of sessionStorage alone loses the draft
// on the second pass. Fresh sessionStorage always wins over the cache.
let guidedCache: EvalDraft | null = null;
function takeGuidedDraft(): EvalDraft | null {
  const stored = sessionStorage.getItem('guided-draft');
  if (stored) {
    sessionStorage.removeItem('guided-draft');
    try {
      guidedCache = JSON.parse(stored) as EvalDraft;
    } catch {
      guidedCache = null;
    }
  }
  return guidedCache;
}

function draftCoachInput(tests: TestDraft[]) {
  return tests.map((t) => ({
    request: t.request,
    checks: t.checks.map(
      (c): CoachCheck =>
        c.kind === 'rubric'
          ? { kind: 'rubric', criterion: c.criterion, threshold: c.threshold, weight: c.weight }
          : c.kind === 'ab-winner'
            ? { kind: 'ab-winner', criterion: c.criterion }
            : { kind: c.kind },
    ),
  }));
}

function CoachPanel({ tests }: { tests: TestDraft[] }) {
  const findings = coachFindings(draftCoachInput(tests));
  if (findings.length === 0) return null;
  return (
    <div className="card" style={{ borderColor: 'var(--running)' }}>
      <h3 style={{ color: 'var(--running)' }}>
        Coach — {findings.length} structural tip{findings.length > 1 ? 's' : ''}
      </h3>
      <ul className="dim" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {findings.map((f, i) => (
          <li key={i}>
            {f.message} <span style={{ opacity: 0.7 }}>({f.principle})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
        <span className="badge">
          {check.kind === 'contains'
            ? 'Text check'
            : check.kind === 'not-contains'
              ? 'Must NOT contain'
              : check.kind === 'ab-winner'
                ? 'Blind A/B winner'
                : 'AI judge'}
        </span>
        <button className="link-btn" onClick={onRemove} title="Remove this check">
          ✕
        </button>
      </div>
      {check.kind === 'contains' || check.kind === 'not-contains' ? (
        <div className="row" style={{ marginTop: 6 }}>
          <label className="field grow">
            <span>{check.kind === 'contains' ? 'Response must contain' : 'Response must NOT contain'}</span>
            <input
              value={check.text}
              placeholder={check.kind === 'contains' ? 'e.g. requirement' : 'e.g. TODO'}
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
      ) : check.kind === 'ab-winner' ? (
        <label className="field" style={{ marginTop: 6 }}>
          <span>The judge picks the variant that best satisfies… (needs a comparison prompt)</span>
          <input
            value={check.criterion}
            placeholder="e.g. Which response better follows the skill's guidance?"
            onChange={(e) => onChange({ ...check, criterion: e.target.value })}
          />
        </label>
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
  hasPromptB,
}: {
  test: TestDraft;
  index: number;
  onChange: (t: TestDraft) => void;
  onRemove: () => void;
  hasPromptB: boolean;
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
                checks: [...test.checks, { kind: 'not-contains', text: '', ignoreCase: true }],
              })
            }
          >
            + Must NOT contain
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
          <button
            disabled={!hasPromptB}
            title={
              hasPromptB
                ? 'The judge blindly picks the better prompt variant for this test'
                : 'Add a comparison prompt (B) first'
            }
            onClick={() =>
              onChange({
                ...test,
                checks: [...test.checks, { kind: 'ab-winner', criterion: '' }],
              })
            }
          >
            + Blind A/B winner
          </button>
        </div>
      </div>
    </div>
  );
}

function BuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editConfig = searchParams.get('config');
  const guided = searchParams.get('guided') === '1';

  const [runners, setRunners] = useState<RunnerInfo[]>([]);
  const [apiProviders, setApiProviders] = useState<ApiProviderOption[]>([]);
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
        setApiProviders(b.apiProviders ?? []);

        // Hydrate from the guided-setup wizard's handoff, if present.
        if (!editConfig && guided) {
          try {
            const taken = takeGuidedDraft();
            if (taken) {
              const guidedDraft = { ...taken };
              if (!guidedDraft.models?.length) {
                guidedDraft.models = [
                  ...b.runners.map((r: RunnerInfo) => ({
                    runner: r.key,
                    kind: 'cli' as const,
                    model: r.defaultModel,
                    enabled: r.key === 'devin',
                  })),
                  ...(b.apiProviders ?? []).map((p: ApiProviderOption) => ({
                    runner: p.key,
                    kind: 'api' as const,
                    model: p.models[0],
                    enabled: false,
                  })),
                ];
              }
              setDraft(guidedDraft);
              return;
            }
          } catch {
            // fall through to the default empty draft
          }
        }

        setDraft(
          b.draft ?? {
            name: '',
            prompt: '',
            models: [
              ...b.runners.map((r: RunnerInfo) => ({
                runner: r.key,
                kind: 'cli' as const,
                model: r.defaultModel,
                enabled: r.key === 'devin',
              })),
              ...(b.apiProviders ?? []).map((p: ApiProviderOption) => ({
                runner: p.key,
                kind: 'api' as const,
                model: p.models[0],
                enabled: false,
              })),
            ],
            judge: 'devin',
            tests: [emptyTest()],
          },
        );
      })
      .catch((e) => setError(String(e)));
  }, [editConfig, guided]);

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

  function setModel(
    kind: 'cli' | 'api',
    runnerKey: string,
    patch: Partial<EvalDraft['models'][number]>,
  ) {
    setDraft({
      ...draft!,
      models: draft!.models.map((m) =>
        m.runner === runnerKey && (m.kind ?? 'cli') === kind ? { ...m, ...patch } : m,
      ),
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

      {draft.promptB === undefined ? (
        <button
          onClick={() => setDraft({ ...draft, promptB: '' })}
          title="Blind A/B: every test runs against both prompts and the judge can pick a winner"
        >
          ⚖ Add comparison prompt (blind A/B)
        </button>
      ) : (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="row spread" style={{ marginBottom: 6 }}>
            <span className="dim" style={{ fontSize: 13 }}>
              <b>Comparison prompt (B)</b> — every test case runs against both prompts, so a run
              costs ~2× per enabled model.
            </span>
            <button
              className="link-btn"
              onClick={() => {
                const hasAb = draft.tests.some((t) => t.checks.some((c) => c.kind === 'ab-winner'));
                if (hasAb) {
                  setError('Remove the Blind A/B winner checks before removing the comparison prompt.');
                  return;
                }
                setError(null);
                setDraft({ ...draft, promptB: undefined, promptBPath: undefined });
              }}
            >
              ✕ Remove
            </button>
          </div>
          <textarea
            className="editor"
            style={{ minHeight: 160 }}
            value={draft.promptB}
            placeholder={'The baseline or alternative prompt to compare against…\n\n{{request}}'}
            spellCheck={false}
            onChange={(e) => setDraft({ ...draft, promptB: e.target.value })}
          />
        </div>
      )}

      <h2>3 · Models</h2>
      <p className="dim" style={{ marginTop: -6 }}>
        Every model that's on answers all test cases, so you can compare them side by side.
      </p>
      <h3 className="model-group-title">CLI runners</h3>
      <div className="model-grid">
        {runners.map((r) => {
          const m = draft.models.find((m) => (m.kind ?? 'cli') === 'cli' && m.runner === r.key)!;
          return (
            <div className={`card model-card ${m.enabled ? 'on' : ''}`} key={r.key}>
              <div className="row spread">
                <h3>{r.name}</h3>
                <label className="switch" title={m.enabled ? 'On' : 'Off'}>
                  <input
                    type="checkbox"
                    checked={m.enabled}
                    onChange={(e) => setModel('cli', r.key, { enabled: e.target.checked })}
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
                  onChange={(e) => setModel('cli', r.key, { model: e.target.value })}
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
                    setModel('cli', r.key, {
                      maxTokens: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </label>
            </div>
          );
        })}
      </div>

      <h3 className="model-group-title">API providers</h3>
      <div className="model-grid">
        {apiProviders.map((p) => {
          const m = draft.models.find((m) => m.kind === 'api' && m.runner === p.key)!;
          return (
            <div
              className={`card model-card ${m.enabled ? 'on' : ''} ${!p.keyConfigured ? 'keyless' : ''}`}
              key={p.key}
            >
              <div className="row spread">
                <h3>{p.label}</h3>
                <label
                  className="switch"
                  title={p.keyConfigured ? (m.enabled ? 'On' : 'Off') : 'Add an API key first'}
                >
                  <input
                    type="checkbox"
                    checked={m.enabled}
                    disabled={!p.keyConfigured}
                    onChange={(e) => setModel('api', p.key, { enabled: e.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </div>
              {!p.keyConfigured && (
                <p className="dim" style={{ fontSize: 12, margin: '2px 0' }}>
                  🔒 <Link href="/settings">Add {p.label} key in Settings →</Link>
                </p>
              )}
              <label className="field">
                <span>Model</span>
                <input
                  list={`models-api-${p.key}`}
                  value={m.model}
                  disabled={!m.enabled}
                  onChange={(e) => setModel('api', p.key, { model: e.target.value })}
                />
                <datalist id={`models-api-${p.key}`}>
                  {p.models.map((name) => (
                    <option value={name} key={name} />
                  ))}
                </datalist>
              </label>
              <label className="field" style={{ marginTop: 6 }}>
                <span>Max tokens (optional)</span>
                <input
                  type="number"
                  min={1}
                  placeholder="provider default"
                  value={m.maxTokens ?? ''}
                  disabled={!m.enabled}
                  onChange={(e) =>
                    setModel('api', p.key, {
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
            <optgroup label="CLI runners">
              {runners.map((r) => (
                <option value={r.key} key={r.key}>
                  {r.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="API providers">
              {apiProviders.map((p) => (
                <option value={p.key} key={p.key} disabled={!p.keyConfigured}>
                  {p.label}
                  {!p.keyConfigured ? ' (no key)' : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {draft.tests.some((t) => t.checks.some((c) => c.kind === 'ab-winner')) &&
          runners.some((r) => r.key === draft.judge) && (
            <p style={{ color: 'var(--running)', fontSize: 13, marginBottom: 0 }}>
              ⚠ Blind A/B winner checks parse most reliably with an API-provider judge — CLI
              wrapper scripts were built for rubric grading and may not return the comparison
              format promptfoo expects.
            </p>
          )}
      </div>

      <h2>4 · Test cases</h2>
      {draft.tests.map((t, i) => (
        <TestEditor
          key={i}
          test={t}
          index={i}
          hasPromptB={draft.promptB !== undefined}
          onChange={(nt) => setDraft({ ...draft, tests: draft.tests.map((o, j) => (j === i ? nt : o)) })}
          onRemove={() => setDraft({ ...draft, tests: draft.tests.filter((_, j) => j !== i) })}
        />
      ))}
      <CoachPanel tests={draft.tests} />

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
