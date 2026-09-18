import { expect, it } from 'vitest';
import sample from '../../docs/sample-analysis.json';
import { endpointParts, scopedAnalysis, selectionEvidence, utcTime } from './domain';
import { parseAnalysis } from './api/validation';
import { createGraph } from './graphModel';

it('sorts by timestamp then ID without mutating input', () => {
  const data = parseAnalysis(structuredClone(sample));
  data.events.reverse();
  data.events[0].timestamp = data.events[1].timestamp;
  const before = data.events.map((item) => item.id);
  const scoped = scopedAnalysis(data, '');
  expect(scoped.events.map((item) => item.id)).toEqual([...before].sort());
  expect(data.events.map((item) => item.id)).toEqual(before);
});
it('limits events and relationships to selected incident evidence', () => {
  const data = parseAnalysis(structuredClone(sample));
  data.incidents.push({ ...data.incidents[0], id: 'INC-002', event_ids: ['evt-008'] });
  const scoped = scopedAnalysis(data, 'INC-002');
  expect(scoped.events.map((item) => item.id)).toEqual(['evt-008']);
  expect(scoped.relationships.every((item) => item.event_ids?.includes('evt-008'))).toBe(true);
  expect(scopedAnalysis(data, '').events).toHaveLength(8);
});
it('keeps full endpoint labels including colons', () => {
  expect(endpointParts('ip:2001:db8::1')).toEqual({ kind: 'ip', label: '2001:db8::1' });
  expect(endpointParts('stage:INC-001:brute_force').label).toBe('INC-001:brute_force');
});
it('formats timestamps in UTC independent of local time', () => {
  expect(utcTime('2026-09-16T07:00:00-05:00')).toBe('2026-09-16 12:00:00 UTC');
});
it('derives every sample graph edge directly from the backend', () => {
  const data = parseAnalysis(sample);
  const graph = createGraph(data.relationships);
  expect(graph.edges).toHaveLength(15);
  expect(graph.nodes).toHaveLength(18);
  expect(new Set(graph.nodes.map((item) => endpointParts(item.id).kind))).toEqual(new Set(['ip', 'host', 'user', 'process', 'stage', 'incident', 'event']));
  for (const relation of data.relationships) {
    expect(graph.edges.find((edge) => edge.id === relation.id)).toMatchObject({ source: relation.source, target: relation.target });
  }
  expect(createGraph([...data.relationships].reverse())).toEqual(graph);
});
it('retains parallel edges and gives them distinct paths', () => {
  const first = parseAnalysis(sample).relationships[0];
  const graph = createGraph([first, { ...first, id: 'parallel' }]);
  expect(graph.edges).toHaveLength(2);
  expect(graph.edges[0].data?.offset).not.toBe(graph.edges[1].data?.offset);
});
it('builds shared evidence highlights for nodes and edges', () => {
  const relationships = parseAnalysis(sample).relationships;
  expect(selectionEvidence({ kind: 'node', id: 'process:curl' }, relationships)).toEqual(new Set(['evt-007']));
  expect(selectionEvidence({ kind: 'relationship', id: 'rel-INC-001-002' }, relationships)).toEqual(new Set(['evt-006']));
});
