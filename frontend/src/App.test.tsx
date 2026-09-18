import { act, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import sample from '../../docs/sample-analysis.json';
import App from './App';
import { mockClient, type AnalysisClients } from './api/client';
import type { AnalysisResponse } from './api/generated';
import { parseAnalysis } from './api/validation';

// Browser tests exercise React Flow. Component tests focus on dashboard/state behavior.
vi.mock('./components/AttackGraph', () => ({ default: () => <div>Graph area</div> }));
const data = () => parseAnalysis(structuredClone(sample));
const clients = (api: AnalysisClients['api']): AnalysisClients => ({ api, demo: mockClient });

describe('investigation workspace', () => {
  it('sends one startup request during the StrictMode setup/cleanup cycle', async () => {
    const analyze = vi.fn().mockResolvedValue(data());
    render(<StrictMode><App clients={clients({ analyze })} /></StrictMode>);
    expect(await screen.findByRole('article')).toBeVisible();
    expect(analyze).toHaveBeenCalledTimes(1);
  });
  it('loads the incident summary and exposes raw evidence on keyboard selection', async () => {
    const user = userEvent.setup();
    render(<App initialMode="demo" />);
    const summary = await screen.findByRole('article', { name: 'Incident INC-001' });
    expect(within(summary).getByText('HIGH')).toBeVisible();
    expect(within(summary).getByText('admin')).toBeVisible();
    expect(within(summary).getByText('4')).toBeVisible();
    expect(within(summary).getByText('8')).toBeVisible();
    const timeline = screen.getByRole('list', { name: 'Chronological events' });
    expect(within(timeline).getAllByRole('button')).toHaveLength(8);
    const event = within(timeline).getAllByRole('button')[0];
    event.focus(); await user.keyboard('{Enter}');
    expect(screen.getByText('Failed SSH login for admin from 10.2.4.18')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Analyze upload' })).toBeDisabled();
  });
  it('shows all events when no incidents exist and handles empty analysis', async () => {
    render(<App clients={clients({ analyze: async () => ({ events: [], incidents: [], relationships: [] }) })} />);
    expect(await screen.findByText(/No events to analyze/)).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Investigation scope' })).toHaveValue('');
  });
  it('shows normalized events with no incidents and missing optional values', async () => {
    const response = parseAnalysis({ events: [{ id: 'e', source: 'auth', event_type: 'login', timestamp: '2026-09-16T12:00:00Z', raw: '<script>alert(1)</script>' }], incidents: [], relationships: [] });
    render(<App clients={clients({ analyze: async () => response })} />);
    expect(await screen.findByText(/No incidents detected/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /Severity 1\/5/ }));
    expect(screen.getByText('<script>alert(1)</script>')).toBeVisible();
    expect(document.querySelector('script')).toBeNull();
  });
  it('clears selected evidence when changing scope', async () => {
    render(<App initialMode="demo" />);
    const timeline = await screen.findByRole('list', { name: 'Chronological events' });
    await userEvent.click(within(timeline).getAllByRole('button')[0]);
    await userEvent.selectOptions(screen.getByRole('combobox'), '');
    expect(screen.getByText('Follow the evidence')).toBeVisible();
  });
  it('keeps API errors visible until explicit demo fallback', async () => {
    render(<App clients={clients({ analyze: async () => { throw new Error('Backend offline'); } })} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend offline');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use demo data' }));
    expect(await screen.findByRole('article', { name: 'Incident INC-001' })).toBeVisible();
    expect(screen.getByText(/Synthetic demo data —/)).toBeVisible();
  });
  it('retries a failed analysis', async () => {
    const analyze = vi.fn().mockRejectedValueOnce(new Error('Try again')).mockResolvedValueOnce(data());
    render(<App clients={clients({ analyze })} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry analysis' }));
    expect(await screen.findByRole('article')).toBeVisible();
    expect(analyze).toHaveBeenCalledTimes(2);
  });
  it('rejects malformed client responses without showing partial data', async () => {
    const broken = data(); broken.events[0].severity = 20;
    render(<App clients={clients({ analyze: async () => broken })} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid analysis data');
    expect(screen.queryByRole('list', { name: 'Chronological events' })).not.toBeInTheDocument();
  });
  it('ignores late API completion after switching to demo', async () => {
    let resolve!: (value: AnalysisResponse) => void;
    let signal!: AbortSignal;
    const pending = new Promise<AnalysisResponse>((done) => { resolve = done; });
    render(<App clients={clients({ analyze: (_, incoming) => { signal = incoming; return pending; } })} />);
    expect(screen.getByText('Reconstructing the incident')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /^Demo$/ }));
    expect(await screen.findByRole('article')).toBeVisible();
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve({ events: [], incidents: [], relationships: [] }); });
    expect(screen.getByRole('article')).toBeVisible();
    expect(screen.getByText(/Synthetic demo data —/)).toBeVisible();
  });
  it('cancels in-flight analysis and ignores its result', async () => {
    let resolve!: (value: AnalysisResponse) => void;
    const pending = new Promise<AnalysisResponse>((done) => { resolve = done; });
    render(<App clients={clients({ analyze: () => pending })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel analysis' }));
    await act(async () => { resolve(data()); });
    expect(screen.getByText('Ready when you are')).toBeVisible();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('retains uploaded records when retrying a failed upload', async () => {
    const analyze = vi.fn().mockResolvedValueOnce(data()).mockRejectedValueOnce(new Error('Upload failed')).mockResolvedValueOnce({ events: [], incidents: [], relationships: [] });
    render(<App clients={clients({ analyze })} />);
    await screen.findByRole('article');
    const file = new File(['[]'], 'empty.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => '[]' });
    await userEvent.upload(screen.getByLabelText('Synthetic JSON records'), file);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze upload' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Analyze upload' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Retry analysis' }));
    expect(await screen.findByText(/No events to analyze/)).toBeVisible();
    expect(analyze.mock.calls[1][0]).toEqual({ records: [] });
    expect(analyze.mock.calls[2][0]).toEqual({ records: [] });
  });
});
