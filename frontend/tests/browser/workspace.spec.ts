import { test, expect } from '@playwright/test';
import sample from '../../../docs/sample-analysis.json' with { type: 'json' };

test('loads the dashboard, renders backend graph relationships, and opens timeline evidence', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/analyze', (route) => route.fulfill({ json: sample }));
  await page.goto('/');
  await expect(page.getByRole('article', { name: 'Incident INC-001' })).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(18);
  await expect(page.locator('.react-flow__edge')).toHaveCount(15);
  const timeline = page.getByRole('list', { name: 'Chronological events' });
  await expect(timeline.getByRole('button')).toHaveCount(8);
  await timeline.getByRole('button').first().click();
  await expect(page.getByRole('complementary')).toContainText('Failed SSH login for admin from 10.2.4.18');
  await expect(page.getByRole('complementary')).toContainText('Metadata');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('workspace.png'), fullPage: true });
});

test('graph nodes and edges are keyboard-selectable and share evidence highlights', async ({ page }) => {
  await page.route('**/api/analyze', (route) => route.fulfill({ json: sample }));
  await page.goto('/');
  const eventNode = page.locator('.react-flow__node[data-id="event:evt-007"]');
  await expect(eventNode).toBeAttached();
  await eventNode.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary')).toContainText('New process curl on web-01');
  await expect(page.getByRole('list', { name: 'Chronological events' }).getByRole('button', { name: /evt-007/ })).toHaveAttribute('aria-pressed', 'true');
  const host = page.locator('.react-flow__node[data-id="host:web-01"]');
  await host.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary')).toContainText('Connected relationships');
  const edge = page.locator('.react-flow__edge[data-id="rel-INC-001-003"]');
  await edge.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary')).toContainText(sample.relationships[2].reason);
  await expect(page.getByRole('complementary').getByRole('button', { name: /evt-007/ })).toBeVisible();
});

test('uploads JSON, sends records, and shows an empty result', async ({ page }) => {
  const requests: unknown[] = [];
  await page.route('**/api/analyze', (route) => {
    const body = route.request().postDataJSON(); requests.push(body);
    return route.fulfill({ json: 'records' in body ? { events: [], incidents: [], relationships: [] } : sample });
  });
  await page.goto('/');
  await expect(page.getByRole('article')).toBeVisible();
  await page.getByLabel('Synthetic JSON records').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from('{"records":[]}') });
  await expect(page.getByText('synthetic.json · 0 records ready')).toBeVisible();
  await page.getByRole('button', { name: 'Analyze upload' }).click();
  await expect(page.getByText(/No events to analyze/)).toBeVisible();
  expect(requests).toEqual([{ sample_id: 'compromise' }, { records: [] }]);
});

test('invalid files do not issue an analysis request', async ({ page }) => {
  let count = 0;
  await page.route('**/api/analyze', (route) => { count++; return route.fulfill({ json: sample }); });
  await page.goto('/');
  await expect(page.getByRole('article')).toBeVisible();
  await page.getByLabel('Synthetic JSON records').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('not-json') });
  await expect(page.getByRole('alert')).toContainText('not valid JSON');
  await expect(page.getByRole('button', { name: 'Analyze upload' })).toBeDisabled();
  expect(count).toBe(1);
});

test('API failure requires explicit fallback and demo makes no API request', async ({ page }) => {
  let count = 0;
  await page.route('**/api/analyze', (route) => { count++; return route.abort(); });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Cannot reach the analysis API');
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: 'Use demo data' }).click();
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.getByText(/Synthetic demo data —/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze upload' })).toBeDisabled();
  expect(count).toBe(1);
});
