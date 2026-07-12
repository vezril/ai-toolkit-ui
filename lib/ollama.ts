import { getOllamaBaseUrl } from './settings';

/**
 * Ollama discovery: a short-timeout, read-only probe of the local model server's
 * `/api/tags`. This is a localhost METADATA call — not inference, no key, no
 * cost — so it does not cross the app's no-direct-model-inference boundary
 * (inference stays inside the promptfoo child). It never throws: an unreachable
 * or non-JSON server resolves to { reachable: false, models: [] }.
 */

export interface OllamaProbe {
  reachable: boolean;
  models: string[];
  baseUrl: string;
}

export async function probeOllama(): Promise<OllamaProbe> {
  const baseUrl = getOllamaBaseUrl();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { reachable: false, models: [], baseUrl };
    const body = await res.json();
    const models = Array.isArray(body?.models)
      ? body.models.map((m: { name?: string }) => String(m?.name ?? '')).filter(Boolean)
      : [];
    return { reachable: true, models, baseUrl };
  } catch {
    return { reachable: false, models: [], baseUrl };
  }
}
