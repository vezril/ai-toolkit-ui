import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT, RUNS_DIR, resolveRepoPath } from './paths';
import { settingsEnv } from './settings';

export type RunStatus = 'running' | 'completed' | 'failed';

export interface RunMeta {
  id: string;
  configPath: string; // repo-relative
  status: RunStatus;
  exitCode: number | null;
  startedAt: number;
  finishedAt: number | null;
  outputFile: string; // absolute path to the results JSON
}

export interface Run extends RunMeta {
  log: string;
}

const MAX_LOG_CHARS = 2_000_000;

// Keep the registry on globalThis so Next.js dev-mode module reloads don't lose live runs.
const store = globalThis as unknown as { __promptfooRuns?: Map<string, Run> };
const runs = (store.__promptfooRuns ??= new Map<string, Run>());

function metaFile(id: string): string {
  return path.join(RUNS_DIR, `${id}.meta.json`);
}

function persistMeta(run: Run): void {
  const { log: _log, ...meta } = run;
  fs.writeFileSync(metaFile(run.id), JSON.stringify(meta, null, 2));
}

function appendLog(run: Run, chunk: string): void {
  run.log = (run.log + chunk).slice(-MAX_LOG_CHARS);
}

export function startRun(configRelPath: string): RunMeta {
  const configAbs = resolveRepoPath(configRelPath);
  if (!fs.existsSync(configAbs)) throw new Error(`Config not found: ${configRelPath}`);
  fs.mkdirSync(RUNS_DIR, { recursive: true });

  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
  const outputFile = path.join(RUNS_DIR, `${id}.json`);

  const run: Run = {
    id,
    configPath: configRelPath,
    status: 'running',
    exitCode: null,
    startedAt: Date.now(),
    finishedAt: null,
    outputFile,
    log: '',
  };
  runs.set(id, run);
  persistMeta(run);

  const args = ['promptfoo', 'eval', '--no-cache', '--config', configAbs, '--output', outputFile];
  appendLog(run, `$ npx ${args.join(' ')}\n\n`);

  // API keys travel to promptfoo as env vars only — never as CLI args (visible
  // in `ps`), never in the log, never in generated YAML.
  const child = spawn('npx', args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...settingsEnv(), FORCE_COLOR: '0' },
  });

  child.stdout.on('data', (d) => appendLog(run, d.toString()));
  child.stderr.on('data', (d) => appendLog(run, d.toString()));
  child.on('error', (err) => {
    appendLog(run, `\n[webui] failed to spawn promptfoo: ${err.message}\n`);
    run.status = 'failed';
    run.finishedAt = Date.now();
    persistMeta(run);
  });
  child.on('close', (code) => {
    if (run.status === 'failed') return; // spawn error already handled
    run.exitCode = code;
    run.finishedAt = Date.now();
    // promptfoo exits non-zero when assertions fail, but the eval itself succeeded
    // as long as it produced a results file.
    run.status = fs.existsSync(outputFile) ? 'completed' : 'failed';
    appendLog(run, `\n[webui] promptfoo exited with code ${code}\n`);
    persistMeta(run);
  });

  const { log: _log, ...meta } = run;
  return meta;
}

export function getRun(id: string): Run | null {
  const live = runs.get(id);
  if (live) return live;
  // Fall back to persisted metadata from a previous server session.
  try {
    const meta = JSON.parse(fs.readFileSync(metaFile(id), 'utf8')) as RunMeta;
    // A run that was live when the server died can never finish now.
    if (meta.status === 'running') meta.status = 'failed';
    return { ...meta, log: '(log unavailable — run predates this server session)' };
  } catch {
    return null;
  }
}

export function listRuns(): RunMeta[] {
  const byId = new Map<string, RunMeta>();
  if (fs.existsSync(RUNS_DIR)) {
    for (const f of fs.readdirSync(RUNS_DIR)) {
      if (!f.endsWith('.meta.json')) continue;
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(RUNS_DIR, f), 'utf8')) as RunMeta;
        if (meta.status === 'running' && !runs.has(meta.id)) meta.status = 'failed';
        byId.set(meta.id, meta);
      } catch {
        // skip unreadable meta files
      }
    }
  }
  for (const run of runs.values()) {
    const { log: _log, ...meta } = run;
    byId.set(run.id, meta);
  }
  return [...byId.values()].sort((a, b) => b.startedAt - a.startedAt);
}
