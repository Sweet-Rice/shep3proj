import { memo, useMemo } from 'react';
import {
  Background, BaseEdge, Controls, Handle, MarkerType, Position, ReactFlow, getBezierPath,
  type EdgeProps, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Relationship } from '../api/generated';
import { createGraph } from '../graphModel';
import type { Selection } from '../domain';
import styles from '../App.module.css';

const EvidenceNode = memo(function EvidenceNode({ data }: NodeProps) {
  return <div className={styles.graphNode} style={{ background: String(data.color) }}>
    <Handle type="target" position={Position.Left} />
    <span className={styles.eyebrow}>{String(data.kind)}</span>
    <span className={styles.nodeLabel}>{String(data.label)}</span>
    <Handle type="source" position={Position.Right} />
  </div>;
});

function EvidenceEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, data } = props;
  const offset = Number(data?.offset ?? 0);
  const [bezier] = getBezierPath(props);
  const distance = Math.hypot(targetX - sourceX, targetY - sourceY) || 1;
  const controlX = (sourceX + targetX) / 2 - (targetY - sourceY) / distance * offset;
  const controlY = (sourceY + targetY) / 2 + (targetX - sourceX) / distance * offset;
  const path = offset === 0 ? bezier : `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;
  return <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} interactionWidth={24} />;
}

const nodeTypes = { evidence: EvidenceNode };
const edgeTypes = { evidence: EvidenceEdge };

interface Props {
  relationships: Relationship[];
  selection: Selection;
  evidence: Set<string>;
  onSelect: (selection: Selection) => void;
}

export default function AttackGraph({ relationships, selection, evidence, onSelect }: Props) {
  const layout = useMemo(() => createGraph(relationships), [relationships]);
  const highlightedEdges = new Set(relationships.filter((item) =>
    (selection?.kind === 'relationship' && selection.id === item.id)
    || (selection?.kind === 'node' && [item.source, item.target].includes(selection.id))
    || (selection?.kind === 'event' && item.event_ids?.some((id) => evidence.has(id))),
  ).map((item) => item.id));
  const highlightedNodes = new Set(relationships.filter((item) => highlightedEdges.has(item.id)).flatMap((item) => [item.source, item.target]));
  const nodes = layout.nodes.map((node) => ({
    ...node,
    selected: selection?.kind === 'node' ? selection.id === node.id : selection?.kind === 'event' && node.id === `event:${selection.id}`,
    style: { borderRadius: 10, outline: highlightedNodes.has(node.id) ? '2px solid #197868' : undefined },
  }));
  const edges = layout.edges.map((edge) => {
    const active = highlightedEdges.has(edge.id);
    return {
      ...edge, selected: selection?.kind === 'relationship' && selection.id === edge.id,
      style: { stroke: active ? '#137563' : '#8798aa', strokeWidth: active ? 2.5 : 1.4 },
      markerEnd: { type: MarkerType.ArrowClosed, color: active ? '#137563' : '#8798aa' },
    };
  });

  if (!relationships.length) return <p className={styles.empty}>No relationships to display for this scope.</p>;
  return <>
    <div className={styles.graphCanvas} aria-label="Attack relationship graph" onKeyDownCapture={(event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const element = (event.target as Element).closest('.react-flow__node, .react-flow__edge');
      const id = element?.getAttribute('data-id');
      if (!element || !id) return;
      event.preventDefault(); event.stopPropagation();
      onSelect(element.classList.contains('react-flow__edge') ? { kind: 'relationship', id }
        : id.startsWith('event:') ? { kind: 'event', id: id.slice(6) } : { kind: 'node', id });
    }}>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        fitView minZoom={0.1} maxZoom={2} nodesDraggable={false} nodesConnectable={false}
        edgesReconnectable={false} deleteKeyCode={null} nodesFocusable edgesFocusable
        onNodeClick={(_, node) => onSelect(node.id.startsWith('event:')
          ? { kind: 'event', id: node.id.slice(6) } : { kind: 'node', id: node.id })}
        onEdgeClick={(_, edge) => onSelect({ kind: 'relationship', id: edge.id })}
        onPaneClick={() => onSelect(null)}
        proOptions={{ hideAttribution: false }}
      >
        <Background color="#d8e1e7" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
    <div className={styles.legend} aria-label="Node types">
      {['host', 'user', 'ip', 'event', 'process', 'incident', 'stage'].map((kind) => <span key={kind}>{kind}</span>)}
    </div>
    <p className={styles.graphHint}>Select a node or connection to inspect its evidence. Scroll to zoom.</p>
  </>;
}
