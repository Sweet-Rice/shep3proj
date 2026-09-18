import { lazy, Suspense, useMemo, useState } from 'react';
import type { AnalysisResponse, Incident } from '../api/generated';
import { eventSummary, humanize, scopedAnalysis, selectionEvidence, utcTime, type Selection } from '../domain';
import EvidencePanel from './EvidencePanel';
import styles from '../App.module.css';

const AttackGraph = lazy(() => import('./AttackGraph'));

function IncidentSummary({ incident }: { incident: Incident }) {
  return <article className={styles.incidentCard} aria-label={`Incident ${incident.id}`}>
    <div className={styles.incidentTitle}><div><p className={styles.eyebrow}>{incident.id} · Incident summary</p><h2>{incident.title}</h2></div><span className={`${styles.severity} ${styles[`severity${incident.severity}`]}`}>{incident.severity}</span></div>
    <div className={styles.incidentMetrics}><span>Score <strong>{incident.score}/5</strong></span><span><strong>{incident.stages.length}</strong> stages</span><span><strong>{new Set(incident.event_ids).size}</strong> evidence events</span></div>
    <dl className={styles.entities}>{(['source_ips', 'users', 'hosts', 'processes', 'destination_ips'] as const).map((kind) => <div key={kind}><dt>{humanize(kind)}</dt><dd>{incident.entities[kind]?.join(', ') || 'Unavailable'}</dd></div>)}</dl>
    <ol className={styles.stages} aria-label="Detection stages">{incident.stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, '0')}</span>{humanize(stage)}</li>)}</ol>
  </article>;
}

export default function Workspace({ data }: { data: AnalysisResponse }) {
  const [scope, setScope] = useState(data.incidents[0]?.id ?? '');
  const [selection, setSelection] = useState<Selection>(null);
  const { incident, events, relationships } = useMemo(() => scopedAnalysis(data, scope), [data, scope]);
  const evidence = useMemo(() => selectionEvidence(selection, relationships), [selection, relationships]);
  function select(next: Selection) {
    // A shared relationship can cite evidence outside the current incident.
    if (next?.kind === 'event' && !events.some((event) => event.id === next.id)) setScope('');
    setSelection(next);
  }

  return <>
    <div className={styles.sectionHeading}><div><h2>Investigation overview</h2><p>{data.events.length} events · {data.incidents.length} incidents · {data.relationships.length} relationships</p></div>
      <label className={styles.scope}>Investigation scope<select value={scope} onChange={(event) => { setScope(event.target.value); setSelection(null); }}><option value="">All events</option>{data.incidents.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</select></label>
    </div>
    {incident ? <IncidentSummary incident={incident} /> : data.incidents.length ? <div className={styles.summaryGrid}>{data.incidents.map((item) => <IncidentSummary key={item.id} incident={item} />)}</div> : <div className={styles.notice}>{data.events.length ? 'No incidents detected. All normalized events are available below.' : 'No events to analyze. Load a sample or choose another synthetic dataset.'}</div>}
    <div className={styles.workspace}>
      <section className={`${styles.panel} ${styles.timelinePanel}`} aria-labelledby="timeline-title">
        <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Sequence</p><h2 id="timeline-title">Event timeline <span className={styles.count}>{events.length}</span></h2></div><span className={styles.muted}>UTC</span></div>
        {events.length ? <ol className={styles.timeline} aria-label="Chronological events">{events.map((event) => <li key={event.id}><button
          className={`${styles.event} ${evidence.has(event.id) ? styles.highlighted : ''}`}
          aria-pressed={selection?.kind === 'event' && selection.id === event.id}
          onClick={() => select({ kind: 'event', id: event.id })}
        ><span className={styles.eventTop}><span className={`${styles.source} ${styles[event.source]}`}>{event.source}</span><span className={styles.eventSeverity}>Severity {event.severity ?? 1}/5</span></span><strong>{humanize(event.event_type)}</strong><time dateTime={event.timestamp}>{utcTime(event.timestamp)}</time><span className={styles.eventContext}>{eventSummary(event)}</span><span className={styles.eventId}>{event.id} <span aria-hidden="true">↗</span></span></button></li>)}</ol> : <p className={styles.empty}>{incident ? 'This incident has no evidence events.' : 'No events to display.'}</p>}
      </section>
      <section className={`${styles.panel} ${styles.graphPanel}`} aria-labelledby="graph-title">
        <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Connections</p><h2 id="graph-title">Attack graph</h2></div><span className={styles.muted}>{relationships.length} relationships</span></div>
        <Suspense fallback={<p className={styles.empty} role="status">Loading graph…</p>}><AttackGraph relationships={relationships} selection={selection} evidence={evidence} onSelect={select} /></Suspense>
      </section>
      <EvidencePanel data={data} selection={selection} relationships={relationships} evidence={evidence} onSelect={select} />
    </div>
  </>;
}
