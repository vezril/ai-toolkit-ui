import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import {
  draftToFiles,
  filesToDraft,
  listApiProviders,
  listRunners,
  type EvalDraft,
} from '@/lib/evals';
import { skillHintsForConfig } from '@/lib/skillEval';
import { probeOllama } from '@/lib/ollama';
import { REPO_ROOT, resolveRepoPath } from '@/lib/paths';

export const dynamic = 'force-dynamic';

/** GET /api/evals -> runner catalog; GET /api/evals?config=path -> draft for editing */
export async function GET(req: NextRequest) {
  const configRel = req.nextUrl.searchParams.get('config');
  try {
    if (!configRel) {
      return NextResponse.json({
        runners: listRunners(),
        apiProviders: listApiProviders(),
        ollama: await probeOllama(),
      });
    }
    const abs = resolveRepoPath(configRel);
    return NextResponse.json({
      draft: filesToDraft(abs),
      runners: listRunners(),
      apiProviders: listApiProviders(),
      ollama: await probeOllama(),
      skillHints: skillHintsForConfig(configRel),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

function writeEvalFiles(draft: EvalDraft, { mustExist }: { mustExist: boolean }) {
  const files = draftToFiles(draft);
  const configAbs = resolveRepoPath(files.configPath);
  const promptAbs = resolveRepoPath(files.promptPath);

  if (mustExist && !fs.existsSync(configAbs)) {
    throw new Error(`Eval not found: ${files.configPath}`);
  }
  if (!mustExist && fs.existsSync(configAbs)) {
    throw new Error(
      `An eval named "${path.basename(files.configPath)}" already exists — pick a different name.`,
    );
  }

  fs.mkdirSync(path.join(REPO_ROOT, path.dirname(files.configPath)), { recursive: true });
  fs.writeFileSync(promptAbs, files.promptText, 'utf8');
  if (files.promptBPath && files.promptBText !== undefined) {
    fs.writeFileSync(resolveRepoPath(files.promptBPath), files.promptBText, 'utf8');
  }
  fs.writeFileSync(configAbs, files.configYaml, 'utf8');
  return files;
}

/** POST /api/evals — create a new eval from a builder draft */
export async function POST(req: NextRequest) {
  try {
    const draft = (await req.json()) as EvalDraft;
    delete draft.configPath; // creation always derives the path from the name
    const files = writeEvalFiles(draft, { mustExist: false });
    return NextResponse.json({ configPath: files.configPath }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}

/** PUT /api/evals — update an existing builder-generated eval */
export async function PUT(req: NextRequest) {
  try {
    const draft = (await req.json()) as EvalDraft;
    if (!draft.configPath) throw new Error('configPath required for updates');
    const files = writeEvalFiles(draft, { mustExist: true });
    return NextResponse.json({ configPath: files.configPath });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
