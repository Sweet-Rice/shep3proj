import { describe, expect, it } from 'vitest';
import sample from '../../../docs/sample-analysis.json';
import { parseAnalysis, parseUpload } from './validation';

describe('analysis contract', () => {
  it('accepts the shared sample and empty analysis', () => {
    expect(parseAnalysis(sample).relationships).toHaveLength(15);
    expect(parseAnalysis({ events: [], incidents: [], relationships: [] }).events).toEqual([]);
  });
  it.each(['timestamp', 'severity', 'source'] as const)('rejects malformed event %s', (field) => {
    const broken = structuredClone(sample);
    Object.assign(broken.events[0], { [field]: field === 'severity' ? 8 : 'invalid' });
    expect(() => parseAnalysis(broken)).toThrow('Invalid analysis data');
  });
  it.each(['events', 'incidents', 'relationships'] as const)('rejects duplicate IDs in %s', (field) => {
    const broken = structuredClone(sample);
    (broken[field] as unknown[]).push(broken[field][0]);
    expect(() => parseAnalysis(broken)).toThrow('duplicate');
  });
  it.each(['incidents', 'relationships'] as const)('rejects unresolved %s evidence', (field) => {
    const broken = structuredClone(sample);
    broken[field][0].event_ids.push('missing');
    expect(() => parseAnalysis(broken)).toThrow('references missing event');
  });
  it('rejects dangling graph event endpoints', () => {
    const broken = structuredClone(sample);
    broken.relationships[0].source = 'event:missing';
    expect(() => parseAnalysis(broken)).toThrow('references missing event:missing');
  });
  it('allows omitted optional fields without changing the response', () => {
    const minimal = { events: [{ id: 'e', timestamp: '2026-09-16T12:00:00Z', source: 'auth', event_type: 'login_failure', raw: '' }], incidents: [], relationships: [] };
    expect(parseAnalysis(minimal)).toEqual(minimal);
    expect(parseAnalysis(minimal).events[0].severity).toBeUndefined();
  });
  it('allows zero bytes, null entities, and absent relationship evidence', () => {
    const valid = structuredClone(sample);
    valid.events[0].bytes_out = 0;
    Reflect.deleteProperty(valid.relationships[0], 'event_ids');
    expect(parseAnalysis(valid).events[0].bytes_out).toBe(0);
  });
});

describe('JSON upload', () => {
  it.each(['[]', '{"records":[]}'])('accepts empty input: %s', (text) => {
    expect(parseUpload(text)).toEqual([]);
  });
  it('preserves source-specific record fields for backend normalization', () => {
    expect(parseUpload('[{"source":"auth","username":"admin"}]')).toEqual([{ source: 'auth', username: 'admin' }]);
  });
  it.each(['no json', 'null', '{}', '[null]', '[[]]', '[3]', '{"records":[],"sample_id":"compromise"}'])('rejects invalid container: %s', (text) => {
    expect(() => parseUpload(text)).toThrow();
  });
});
