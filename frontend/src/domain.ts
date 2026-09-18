import type { AnalysisResponse, NormalizedEvent, Relationship } from './api/generated';

export type Selection = { kind: 'event' | 'node' | 'relationship'; id: string } | null;
export const humanize = (value: string) => value.replaceAll('_', ' ');
export const utcTime = (value: string) => new Date(value).toISOString().replace('T', ' ').replace(/\.000Z$/, ' UTC').replace(/Z$/, ' UTC');

export function endpointParts(id: string) {
  const separator = id.indexOf(':');
  return separator < 0 ? { kind: 'entity', label: id } : { kind: id.slice(0, separator), label: id.slice(separator + 1) };
}

export function scopedAnalysis(data: AnalysisResponse, incidentId: string) {
  const incident = data.incidents.find((item) => item.id === incidentId);
  const ids = incident ? new Set(incident.event_ids) : null;
  const events = (ids ? data.events.filter((event) => ids.has(event.id)) : [...data.events])
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const relationships = ids ? data.relationships.filter((item) => item.event_ids?.some((id) => ids.has(id))) : data.relationships;
  return { incident, events, relationships };
}

export function selectionEvidence(selection: Selection, relationships: Relationship[]): Set<string> {
  if (!selection) return new Set();
  if (selection.kind === 'event') return new Set([selection.id]);
  const related = relationships.filter((item) => selection.kind === 'relationship'
    ? item.id === selection.id : item.source === selection.id || item.target === selection.id);
  return new Set(related.flatMap((item) => item.event_ids ?? []));
}

export function eventSummary(event: NormalizedEvent): string {
  return [event.host, event.user, event.process, event.dst_ip ?? event.src_ip].filter(Boolean).join(' · ') || 'No entity information';
}
