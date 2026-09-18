import type { AnalysisResponse } from './generated';
import { parseAnalysis } from './validation';

export type AnalysisRequest =
  | { sample_id: 'compromise'; records?: never }
  | { records: Record<string, unknown>[]; sample_id?: never };
export interface AnalysisClient {
  analyze(request: AnalysisRequest, signal: AbortSignal): Promise<AnalysisResponse>;
}
export type DataMode = 'api' | 'demo';
export type AnalysisClients = Record<DataMode, AnalysisClient>;

function errorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !('detail' in body)) return;
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail)) {
    return body.detail.map((item: unknown) => {
      if (!item || typeof item !== 'object' || !('msg' in item) || typeof item.msg !== 'string') return '';
      const location = 'loc' in item && Array.isArray(item.loc) ? item.loc.join('.') : '';
      return `${location ? `${location}: ` : ''}${item.msg}`;
    }).filter(Boolean).join('; ') || undefined;
  }
}

export function createApiClient(baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'): AnalysisClient {
  return {
    async analyze(request, signal) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/analyze`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request), signal,
        });
      } catch (error) {
        if (signal.aborted) throw error;
        throw new Error('Cannot reach the analysis API. Check the backend connection, retry, or use demo data.');
      }
      let body: unknown;
      try { body = await response.json(); }
      catch {
        signal.throwIfAborted();
        throw new Error(`The API returned ${response.ok ? 'invalid JSON' : `HTTP ${response.status} without a JSON error`}.`);
      }
      signal.throwIfAborted();
      if (!response.ok) throw new Error(errorDetail(body) || `Analysis failed (HTTP ${response.status}).`);
      return parseAnalysis(body);
    },
  };
}

export const mockClient: AnalysisClient = {
  async analyze(request, signal) {
    if ('records' in request) throw new Error('Upload analysis requires API mode.');
    const { default: sample } = await import('../../../docs/sample-analysis.json');
    signal.throwIfAborted();
    return parseAnalysis(structuredClone(sample));
  },
};

export const defaultClients: AnalysisClients = { api: createApiClient(), demo: mockClient };
