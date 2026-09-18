import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { Relationship } from './api/generated';
import { endpointParts, humanize } from './domain';

const colors: Record<string, string> = {
  host: '#e5f3f0', user: '#eaf0ff', ip: '#fff4dc', event: '#f1f3f6',
  process: '#f2ebff', incident: '#ffeae6', stage: '#e7f3fb',
};

export function createGraph(relationships: Relationship[]): { nodes: Node[]; edges: Edge[] } {
  const endpoints = [...new Set(relationships.flatMap((item) => [item.source, item.target]))].sort();
  const graph = new dagre.graphlib.Graph({ multigraph: true });
  graph.setGraph({ rankdir: 'LR', nodesep: 28, ranksep: 75, marginx: 20, marginy: 20 });
  graph.setDefaultEdgeLabel(() => ({}));
  endpoints.forEach((id) => graph.setNode(id, { width: 176, height: 64 }));
  const sorted = [...relationships].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  sorted.forEach((item) => graph.setEdge(item.source, item.target, {}, item.id));
  dagre.layout(graph);
  const pairs = new Map<string, Relationship[]>();
  sorted.forEach((item) => {
    const key = JSON.stringify([item.source, item.target]);
    pairs.set(key, [...(pairs.get(key) ?? []), item]);
  });
  return {
    nodes: endpoints.map((id) => {
      const { kind, label } = endpointParts(id);
      const position = graph.node(id);
      return {
        id, type: 'evidence', position: { x: position.x - 88, y: position.y - 32 },
        data: { kind, label: humanize(label), color: colors[kind] ?? '#f1f3f6' },
        ariaLabel: `${kind}: ${label}`, width: 176, height: 64,
      };
    }),
    edges: sorted.map((item) => {
      const siblings = pairs.get(JSON.stringify([item.source, item.target]))!;
      return {
        id: item.id, source: item.source, target: item.target, type: 'evidence',
        data: { offset: (siblings.indexOf(item) - (siblings.length - 1) / 2) * 44 },
        ariaLabel: `${item.id}: ${item.relationship_type} from ${item.source} to ${item.target}`,
      };
    }),
  };
}
