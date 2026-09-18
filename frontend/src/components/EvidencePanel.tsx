import { useEffect, useRef } from 'react';
import type { AnalysisResponse, Relationship } from '../api/generated';
import { endpointParts, humanize, type Selection } from '../domain';
import styles from '../App.module.css';

interface Props {
  data: AnalysisResponse;
  selection: Selection;
  relationships: Relationship[];
  evidence: Set<string>;
  onSelect: (selection: Selection) => void;
}

export default function EvidencePanel({ data, selection, relationships, evidence, onSelect }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (selection && window.matchMedia('(max-width: 900px)').matches) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [selection]);
  const event = selection?.kind === 'event' ? data.events.find((item) => item.id === selection.id) : undefined;
  const relationship = selection?.kind === 'relationship' ? relationships.find((item) => item.id === selection.id) : undefined;
  const node = selection?.kind === 'node' ? endpointParts(selection.id) : undefined;
  const adjacent = node && selection ? relationships.filter((item) => item.source === selection.id || item.target === selection.id) : [];
  const incident = node?.kind === 'incident' ? data.incidents.find((item) => item.id === node.label) : undefined;

  return <aside className={`${styles.panel} ${styles.evidencePanel}`} aria-labelledby="evidence-title">
    <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Inspect</p><h2 id="evidence-title" ref={heading} tabIndex={-1}>Evidence details</h2></div></div>
    {!selection ? <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">↗</span><h3>Follow the evidence</h3><p>Select an event, node, or connection to see the details behind it.</p></div> : <div className={styles.details}>
      <p className={styles.code}>{selection.id}</p>
      {event ? <>
        <h3>{humanize(event.event_type)}</h3>
        <dl className={styles.detailList}>
          {Object.entries(event).filter(([key]) => key !== 'raw' && key !== 'metadata').map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd>{value === null || value === undefined ? 'Unavailable' : String(value)}</dd></div>)}
          {(['user', 'src_ip', 'dst_ip', 'host', 'process', 'bytes_out'] as const).filter((key) => !(key in event)).map((key) => <div key={key}><dt>{humanize(key)}</dt><dd>Unavailable</dd></div>)}
          {event.severity === undefined ? <div><dt>severity</dt><dd>1 (default)</dd></div> : null}
        </dl>
        <h3>Raw evidence</h3><pre className={styles.raw}>{event.raw}</pre>
        <h3>Metadata</h3><pre className={styles.raw}>{JSON.stringify(event.metadata ?? {}, null, 2)}</pre>
      </> : null}
      {relationship ? <>
        <h3>{humanize(relationship.relationship_type)}</h3>
        <dl className={styles.detailList}><div><dt>Type</dt><dd>{relationship.relationship_type}</dd></div><div><dt>Source</dt><dd>{relationship.source}</dd></div><div><dt>Target</dt><dd>{relationship.target}</dd></div></dl>
        <h3>Why they are connected</h3><p>{relationship.reason}</p>
      </> : null}
      {node ? <>
        <h3>{humanize(node.kind)} details</h3><p>{node.label}</p>
        {incident ? <p>{incident.title} · {incident.severity} · {incident.stages.length} stages</p> : null}
        <h3>Connected relationships</h3>
        <ul className={styles.linkList}>{adjacent.map((item) => <li key={item.id}><button onClick={() => onSelect({ kind: 'relationship', id: item.id })}>{humanize(item.relationship_type)}<small>{item.source} → {item.target}</small></button></li>)}</ul>
      </> : null}
      {!event ? <><h3>Supporting events <span className={styles.count}>{evidence.size}</span></h3>
        {evidence.size ? <ul className={styles.linkList}>{data.events.filter((item) => evidence.has(item.id)).map((item) => <li key={item.id}><button onClick={() => onSelect({ kind: 'event', id: item.id })}>{item.id}<small>{humanize(item.event_type)}</small></button></li>)}</ul> : <p>No supporting events supplied.</p>}
      </> : null}
    </div>}
  </aside>;
}
