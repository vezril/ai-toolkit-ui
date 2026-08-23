import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectEvalBacked } from '../../../lib/eval-provenance';

describe('detectEvalBacked', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-provenance-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // AC-1
  it('reports eval-backed = true when the eval suite folder contains promptfooconfig.yaml', () => {
    const evalSuiteDir = path.join(tmpDir, 'skill-with-eval');
    fs.mkdirSync(evalSuiteDir, { recursive: true });
    fs.writeFileSync(path.join(evalSuiteDir, 'promptfooconfig.yaml'), 'prompts: []\n');

    expect(detectEvalBacked(evalSuiteDir)).toBe(true);
  });

  // AC-2: eval suite folder exists but has no promptfooconfig.yaml
  it('reports eval-backed = false when the eval suite folder does not contain promptfooconfig.yaml', () => {
    const evalSuiteDir = path.join(tmpDir, 'skill-without-config');
    fs.mkdirSync(evalSuiteDir, { recursive: true });
    fs.writeFileSync(path.join(evalSuiteDir, 'README.md'), '# notes\n');

    expect(detectEvalBacked(evalSuiteDir)).toBe(false);
  });

  // AC-2: no eval suite folder at all (path does not exist on disk)
  it('reports eval-backed = false when the eval suite folder does not exist on disk', () => {
    const missingDir = path.join(tmpDir, 'does-not-exist');

    expect(detectEvalBacked(missingDir)).toBe(false);
  });

  // AC-2: item has no eval suite folder reference at all
  it('reports eval-backed = false when the item has no eval suite folder reference', () => {
    expect(detectEvalBacked(null)).toBe(false);
  });

  // AC-2: promptfooconfig.yaml exists but as a subdirectory, not a file
  it('reports eval-backed = false when promptfooconfig.yaml exists only as a directory, not a file', () => {
    const evalSuiteDir = path.join(tmpDir, 'skill-with-bad-config');
    fs.mkdirSync(path.join(evalSuiteDir, 'promptfooconfig.yaml'), { recursive: true });

    expect(detectEvalBacked(evalSuiteDir)).toBe(false);
  });
});
