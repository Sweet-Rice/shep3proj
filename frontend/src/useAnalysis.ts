import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisClients, AnalysisRequest, DataMode } from './api/client';
import type { AnalysisResponse } from './api/generated';
import { parseAnalysis } from './api/validation';

type AnalysisState =
  | { phase: 'loading' | 'idle'; mode: DataMode; label: string }
  | { phase: 'error'; mode: DataMode; label: string; error: string }
  | { phase: 'success'; mode: DataMode; label: string; data: AnalysisResponse };

const sampleRequest: AnalysisRequest = { sample_id: 'compromise' };

export function useAnalysis(clients: AnalysisClients, initialMode: DataMode) {
  const [state, setState] = useState<AnalysisState>({ phase: 'loading', mode: initialMode, label: 'Compromise sample' });
  const active = useRef<AbortController | null>(null);
  const version = useRef(0);
  const last = useRef({ mode: initialMode, request: sampleRequest, label: 'Compromise sample' });

  const run = useCallback(async (mode: DataMode, request: AnalysisRequest, label: string) => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const currentVersion = ++version.current;
    last.current = { mode, request, label };
    setState({ phase: 'loading', mode, label });
    try {
      const data = parseAnalysis(await clients[mode].analyze(request, controller.signal));
      if (currentVersion === version.current && !controller.signal.aborted) {
        setState({ phase: 'success', mode, label, data });
      }
    } catch (error) {
      if (currentVersion === version.current && !controller.signal.aborted) {
        setState({ phase: 'error', mode, label, error: error instanceof Error ? error.message : 'Analysis failed. Please retry.' });
      }
    }
  }, [clients]);

  useEffect(() => {
    let disposed = false;
    // StrictMode immediately cleans up its first setup. Avoid sending that abandoned POST.
    queueMicrotask(() => { if (!disposed) void run(initialMode, sampleRequest, 'Compromise sample'); });
    return () => { disposed = true; ++version.current; active.current?.abort(); };
  }, [initialMode, run]);

  return {
    state,
    loadSample: (mode = state.mode) => { void run(mode, sampleRequest, 'Compromise sample'); },
    upload: (records: Record<string, unknown>[], name: string) => { void run('api', { records }, name); },
    retry: () => { const { mode, request, label } = last.current; void run(mode, request, label); },
    cancel: () => {
      ++version.current;
      active.current?.abort();
      setState({ phase: 'idle', mode: state.mode, label: state.label });
    },
  };
}
