import * as fs from 'fs';
import * as path from 'path';

export function detectEvalBacked(evalSuiteDir: string | null): boolean {
  if (!evalSuiteDir) {
    return false;
  }

  const configPath = path.join(evalSuiteDir, 'promptfooconfig.yaml');

  try {
    return fs.statSync(configPath).isFile();
  } catch {
    return false;
  }
}

export interface CatalogItem {
  type: 'skill' | 'agent';
  name: string;
  evalSuiteDir: string | null;
}

export interface CatalogEvalStatus {
  type: 'skill' | 'agent';
  name: string;
  evalSuiteDir: string | null;
  evalBacked: boolean;
}

export function computeCatalogEvalStatus(items: CatalogItem[]): CatalogEvalStatus[] {
  return items.map((item) => ({
    ...item,
    evalBacked: detectEvalBacked(item.evalSuiteDir),
  }));
}
