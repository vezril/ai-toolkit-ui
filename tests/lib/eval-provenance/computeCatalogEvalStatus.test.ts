import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { computeCatalogEvalStatus } from '../../../lib/eval-provenance';

describe('computeCatalogEvalStatus', () => {
  let tmpDir: string;

  const makeEvalSuiteDir = (name: string, withConfig: boolean) => {
    const dir = path.join(tmpDir, name);
    fs.mkdirSync(dir, { recursive: true });
    if (withConfig) {
      fs.writeFileSync(path.join(dir, 'promptfooconfig.yaml'), 'prompts: []\n');
    } else {
      fs.writeFileSync(path.join(dir, 'README.md'), '# notes\n');
    }
    return dir;
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-provenance-catalog-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // AC-3
  it('matches ground truth for every item in a mixed fixture catalog, with zero false positives', () => {
    const fixtureCatalog = [
      {
        type: 'skill' as const,
        name: 'skill-alpha',
        evalSuiteDir: makeEvalSuiteDir('skill-alpha-evals', true),
        expectedEvalBacked: true,
      },
      {
        type: 'agent' as const,
        name: 'agent-beta',
        evalSuiteDir: makeEvalSuiteDir('agent-beta-evals', true),
        expectedEvalBacked: true,
      },
      {
        type: 'skill' as const,
        name: 'skill-gamma',
        evalSuiteDir: makeEvalSuiteDir('skill-gamma-evals', false),
        expectedEvalBacked: false,
      },
      {
        type: 'agent' as const,
        name: 'agent-delta',
        evalSuiteDir: path.join(tmpDir, 'agent-delta-evals-missing'),
        expectedEvalBacked: false,
      },
      {
        type: 'skill' as const,
        name: 'skill-epsilon',
        evalSuiteDir: null,
        expectedEvalBacked: false,
      },
    ];

    const items = fixtureCatalog.map(({ type, name, evalSuiteDir }) => ({ type, name, evalSuiteDir }));
    const results = computeCatalogEvalStatus(items);

    expect(results).toHaveLength(fixtureCatalog.length);

    for (const fixture of fixtureCatalog) {
      const result = results.find((r) => r.name === fixture.name);
      expect(result).toBeDefined();
      expect(result?.evalBacked).toBe(fixture.expectedEvalBacked);
    }

    const falsePositives = results.filter((r) => {
      const fixture = fixtureCatalog.find((f) => f.name === r.name);
      return fixture?.expectedEvalBacked === false && r.evalBacked === true;
    });
    expect(falsePositives).toHaveLength(0);

    const expectedTrueCount = fixtureCatalog.filter((f) => f.expectedEvalBacked).length;
    const actualTrueCount = results.filter((r) => r.evalBacked).length;
    expect(actualTrueCount).toBe(expectedTrueCount);
  });

  it('returns an empty result for an empty catalog', () => {
    expect(computeCatalogEvalStatus([])).toEqual([]);
  });
});
