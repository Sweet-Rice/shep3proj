import { useRef, useState } from 'react';
import { defaultClients, type AnalysisClients, type DataMode } from './api/client';
import { parseUpload } from './api/validation';
import { useAnalysis } from './useAnalysis';
import Workspace from './components/Workspace';
import styles from './App.module.css';

export default function App({ clients = defaultClients, initialMode = 'api' }: { clients?: AnalysisClients; initialMode?: DataMode }) {
  const { state, loadSample, upload, retry, cancel } = useAnalysis(clients, initialMode);
  const [file, setFile] = useState<{ name: string; records: Record<string, unknown>[] } | null>(null);
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const fileVersion = useRef(0);
  const loading = state.phase === 'loading';

  async function readFile(file: File | undefined) {
    const version = ++fileVersion.current;
    setFile(null); setFileError('');
    setReading(Boolean(file));
    if (!file) return;
    try {
      const records = parseUpload(await file.text());
      if (version === fileVersion.current) setFile({ name: file.name, records });
    } catch (error) {
      if (version === fileVersion.current) setFileError(error instanceof Error ? error.message : 'Could not read this file.');
    } finally {
      if (version === fileVersion.current) setReading(false);
    }
  }

  return <div className={styles.app}>
    <a href="#main-content" className={styles.skip}>Skip to investigation</a>
    <header className={styles.header}><div className={styles.brand}><span className={styles.brandMark} aria-hidden="true">t<span>↗</span></span><div><span className={styles.brandName}>traceback</span><span className={styles.brandSubtitle}>Incident reconstruction</span></div></div><span className={styles.headerLabel}>Investigation workspace <span className={styles.headerDot} /></span></header>
    <main id="main-content" className={styles.main}>
      <div className={styles.pageHeading}><div><p className={styles.eyebrow}>From signals to a sequence</p><h1>Follow the story behind an incident.</h1><p>Connect authentication, process, and network evidence in one place.</p></div><span className={styles.modeBadge}>{state.mode === 'demo' ? 'Demo mode · Synthetic data' : 'API mode'}</span></div>
      <section className={styles.toolbar} aria-label="Analysis controls">
        <div className={styles.modeGroup} role="group" aria-label="Data mode"><button aria-pressed={state.mode === 'api'} onClick={() => loadSample('api')}>API</button><button aria-pressed={state.mode === 'demo'} onClick={() => loadSample('demo')}>Demo</button></div>
        <button className={styles.primaryButton} onClick={() => loadSample()} disabled={loading}>Analyze sample <span aria-hidden="true">↗</span></button>
        <div className={styles.upload}><label htmlFor="records-file">Synthetic JSON records</label><input id="records-file" type="file" accept=".json,application/json" disabled={state.mode === 'demo' || loading} onChange={(event) => { void readFile(event.target.files?.[0]); }} aria-describedby="upload-help" /></div>
        <button className={styles.secondaryButton} disabled={state.mode === 'demo' || loading || reading || !file} onClick={() => { if (file) upload(file.records, file.name); }}>Analyze upload</button>
        <p id="upload-help" className={styles.uploadHelp}>{state.mode === 'demo' ? 'Uploads require API mode. Demo uses the bundled synthetic sample.' : reading ? 'Reading file…' : file ? `${file.name} · ${file.records.length} records ready` : 'Choose a record array or { "records": [...] } JSON file.'}</p>
        {fileError ? <p role="alert" className={styles.fileError}>{fileError}</p> : null}
      </section>
      {state.mode === 'demo' ? <p className={styles.demoNotice}>Synthetic demo data — this analysis comes from the bundled fixture, not the live API.</p> : null}
      <div className={styles.analysisLabel} aria-live="polite">{state.phase === 'success' ? `Analysis loaded · ${state.label}` : state.phase === 'loading' ? `Analyzing · ${state.label}` : state.phase === 'idle' ? 'Analysis cancelled. Load a sample or retry your last analysis.' : ''}</div>
      {loading ? <section className={styles.statePanel}><span className={styles.spinner} aria-hidden="true" /><h2>Reconstructing the incident</h2><p>Normalizing records and connecting the evidence.</p><button className={styles.secondaryButton} onClick={cancel}>Cancel analysis</button></section> : null}
      {state.phase === 'error' ? <section className={styles.statePanel} role="alert"><h2>Analysis could not be loaded</h2><p>{state.error}</p><div className={styles.actions}><button className={styles.primaryButton} onClick={retry}>Retry analysis</button>{state.mode === 'api' ? <button className={styles.secondaryButton} onClick={() => loadSample('demo')}>Use demo data</button> : null}</div></section> : null}
      {state.phase === 'idle' ? <div className={styles.statePanel}><h2>Ready when you are</h2><button className={styles.secondaryButton} onClick={retry}>Retry analysis</button></div> : null}
      {state.phase === 'success' ? <Workspace data={state.data} /> : null}
      <footer className={styles.footer}><span>TRACEBACK / INCIDENT RECONSTRUCTION</span><span>All times shown in UTC · Synthetic telemetry only</span></footer>
    </main>
  </div>;
}
