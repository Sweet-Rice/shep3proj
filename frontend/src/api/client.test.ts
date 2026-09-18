import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import sample from '../../../docs/sample-analysis.json';
import { createApiClient, mockClient } from './client';

const url = 'http://localhost:8000/api/analyze';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('real analysis client', () => {
  it.each([{ sample_id: 'compromise' } as const, { records: [] }])('sends exactly the requested JSON body: %j', async (request) => {
    server.use(http.post(url, async ({ request: incoming }) => {
      expect(await incoming.json()).toEqual(request);
      expect(incoming.headers.get('Content-Type')).toBe('application/json');
      return HttpResponse.json(sample);
    }));
    expect((await createApiClient().analyze(request, new AbortController().signal)).events).toHaveLength(8);
  });
  it.each([
    ['record 1: invalid timestamp', 'record 1: invalid timestamp'],
    [[{ loc: ['body', 'records', 0], msg: 'Invalid record' }], 'body.records.0: Invalid record'],
  ])('shows FastAPI detail %j', async (detail, expected) => {
    server.use(http.post(url, () => HttpResponse.json({ detail }, { status: 422 })));
    await expect(createApiClient().analyze({ records: [] }, new AbortController().signal)).rejects.toThrow(String(expected));
  });
  it('shows connection failures without falling back to mock data', async () => {
    server.use(http.post(url, () => HttpResponse.error()));
    await expect(createApiClient().analyze({ records: [] }, new AbortController().signal)).rejects.toThrow('Cannot reach');
  });
  it('handles non-JSON server errors', async () => {
    server.use(http.post(url, () => new HttpResponse('broken', { status: 503 })));
    await expect(createApiClient().analyze({ records: [] }, new AbortController().signal)).rejects.toThrow('HTTP 503');
  });
  it('rejects a malformed successful response', async () => {
    server.use(http.post(url, () => HttpResponse.json({ events: [] })));
    await expect(createApiClient().analyze({ records: [] }, new AbortController().signal)).rejects.toThrow('Invalid analysis');
  });
  it('supports cancellation', async () => {
    server.use(http.post(url, async () => { await delay(100); return HttpResponse.json(sample); }));
    const controller = new AbortController();
    const pending = createApiClient().analyze({ records: [] }, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('demo client', () => {
  it('loads independent fixture copies without making network requests', async () => {
    const first = await mockClient.analyze({ sample_id: 'compromise' }, new AbortController().signal);
    first.events.length = 0;
    expect((await mockClient.analyze({ sample_id: 'compromise' }, new AbortController().signal)).events).toHaveLength(8);
  });
  it('rejects upload analysis instead of pretending to analyze the file', async () => {
    await expect(mockClient.analyze({ records: [] }, new AbortController().signal)).rejects.toThrow('requires API mode');
  });
});
