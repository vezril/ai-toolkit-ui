'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CheckDraft, EvalDraft, TestDraft } from '@/lib/evals';

const STAGES = ['Purpose', 'Success', 'Failure', 'Evidence', 'Calibrate'] as const;

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'at', 'least', 'one', 'of', 'to', 'is', 'are', 'that',
  'with', 'for', 'and', 'or', 'in', 'on', 'response', 'includes', 'contains',
]);

/** "Includes at least one working code example" → "working-code-example" */
function slugMetric(line: string, used: Set<string>): string {
  const words = line
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .slice(0, 4);
  let slug = words.join('-') || 'criterion';
  let candidate = slug;
  for (let i = 2; used.has(candidate); i++) candidate = `${slug}-${i}`;
  used.add(candidate);
  return candidate;
}

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-*•]\s*/, ''))
    .filter(Boolean);
}

export default function GuidePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [success, setSuccess] = useState('');
  const [never, setNever] = useState('');
  const [modes, setModes] = useState('');
  const [easy, setEasy] = useState('');
  const [hard, setHard] = useState('');
  const [ambiguous, setAmbiguous] = useState('');
  const [loadBearing, setLoadBearing] = useState<string[]>([]);

  // Every rubric criterion the answers imply — the Calibrate stage's chip list.
  const criteria = [
    ...lines(success),
    ...lines(modes).map((l) => `The response avoids: ${l}`),
  ];

  function toggleLoadBearing(criterion: string) {
    setLoadBearing((prev) =>
      prev.includes(criterion) ? prev.filter((c) => c !== criterion) : [...prev, criterion],
    );
  }

  function finish() {
    const used = new Set<string>();
    const rubricChecks: CheckDraft[] = criteria.map((criterion) => ({
      kind: 'rubric',
      criterion,
      metric: slugMetric(criterion.replace(/^The response avoids: /, ''), used),
      threshold: loadBearing.includes(criterion) ? 0.7 : 0.5,
      weight: loadBearing.includes(criterion) ? 2 : 1,
    }));
    const notContainsChecks: CheckDraft[] = lines(never).map((text) => ({
      kind: 'not-contains',
      text,
      ignoreCase: true,
    }));
    const checks = [...rubricChecks, ...notContainsChecks];

    const cases: [string, string][] = (
      [
        ['Easy case', easy],
        ['Hard case', hard],
        ['Ambiguous case', ambiguous],
      ] as [string, string][]
    ).filter(([, r]) => r.trim());

    const tests: TestDraft[] = (cases.length ? cases : [['Test case', '']]).map(
      ([description, request]) => ({
        description,
        request,
        // Independent copies so per-test edits in the builder don't alias.
        checks: checks.length
          ? checks.map((c) => ({ ...c }))
          : [{ kind: 'contains', text: '', ignoreCase: true }],
      }),
    );

    const draft: Partial<EvalDraft> = {
      name: name.trim() || 'Guided eval',
      prompt,
      models: [], // the builder fills its defaults on hydration
      judge: 'devin',
      tests,
    };
    sessionStorage.setItem('guided-draft', JSON.stringify(draft));
    router.push('/new?guided=1');
  }

  const next = () => (step === STAGES.length - 1 ? finish() : setStep(step + 1));

  return (
    <>
      <h1>✦ Guided setup</h1>
      <p className="subtitle">
        Five quick prompts that leave behind a well-formed eval. Everything is editable in the
        builder afterward — skip anything.
      </p>

      <div className="row" style={{ marginBottom: 16 }}>
        {STAGES.map((s, i) => (
          <span key={s} className={`badge ${i === step ? 'pass' : ''}`}>
            {i + 1} · {s}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div className="card">
          <label className="field">
            <span>What are you evaluating?</span>
            <input value={name} placeholder="e.g. PRD generator" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field" style={{ marginTop: 10 }}>
            <span>The prompt under test — paste it if you have one, or sketch it</span>
            <textarea
              className="editor"
              style={{ minHeight: 160 }}
              value={prompt}
              spellCheck={false}
              placeholder={'You are an expert…\n\n(Write {{request}} where each test input goes — added automatically if you leave it out.)'}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <label className="field">
            <span>What does a GOOD response observably contain or do? One per line — each becomes an AI-judge check.</span>
            <textarea
              className="editor"
              style={{ minHeight: 160 }}
              value={success}
              spellCheck={false}
              placeholder={'Includes functional requirements with stable IDs\nStates explicit non-goals\nEnds with measurable success metrics'}
              onChange={(e) => setSuccess(e.target.value)}
            />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <label className="field">
            <span>Text that must NEVER appear — one per line (each becomes a must-NOT-contain check)</span>
            <textarea
              className="editor"
              style={{ minHeight: 100 }}
              value={never}
              spellCheck={false}
              placeholder={'TODO\nAs an AI language model'}
              onChange={(e) => setNever(e.target.value)}
            />
          </label>
          <label className="field" style={{ marginTop: 10 }}>
            <span>Likely failure modes — one per line (each becomes an "avoids…" judge check)</span>
            <textarea
              className="editor"
              style={{ minHeight: 100 }}
              value={modes}
              spellCheck={false}
              placeholder={'inventing requirements the user never asked for\nrestating the request instead of answering it'}
              onChange={(e) => setModes(e.target.value)}
            />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <p className="dim" style={{ marginTop: 0, fontSize: 13 }}>
            Three realistic inputs — vary the difficulty. Each becomes a test case carrying all
            your checks.
          </p>
          {(
            [
              ['Easy case — the prompt should nail this', easy, setEasy],
              ['Hard case — stretches the prompt', hard, setHard],
              ['Ambiguous case — under-specified on purpose', ambiguous, setAmbiguous],
            ] as [string, string, (v: string) => void][]
          ).map(([label, value, set]) => (
            <label className="field" style={{ marginTop: 8 }} key={label}>
              <span>{label}</span>
              <textarea rows={2} value={value} spellCheck={false} onChange={(e) => set(e.target.value)} />
            </label>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <p className="dim" style={{ marginTop: 0, fontSize: 13 }}>
            Tap the load-bearing criteria — they get weight ×2 and pass bar 0.7; the rest stay ×1
            at 0.5.
          </p>
          {criteria.length === 0 ? (
            <p className="dim">No criteria yet (stages 2–3 were skipped) — that's fine.</p>
          ) : (
            <div className="row">
              {criteria.map((c) => (
                <button
                  key={c}
                  className={`badge ${loadBearing.includes(c) ? 'pass' : ''}`}
                  style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
                  onClick={() => toggleLoadBearing(c)}
                >
                  {loadBearing.includes(c) ? '★ ' : ''}
                  {c.length > 60 ? `${c.slice(0, 60)}…` : c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="row" style={{ marginTop: 18 }}>
        {step > 0 && <button onClick={() => setStep(step - 1)}>← Back</button>}
        <button className="primary" onClick={next}>
          {step === STAGES.length - 1 ? '✦ Open in builder' : 'Next →'}
        </button>
        {step < STAGES.length - 1 && (
          <button className="link-btn" onClick={() => setStep(step + 1)}>
            skip
          </button>
        )}
      </div>
    </>
  );
}
