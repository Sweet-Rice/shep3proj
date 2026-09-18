import { test, expect } from '@playwright/test';
import path from 'node:path';

test('real backend reconstructs the sample and uploaded synthetic telemetry', async ({ page }) => {
  // No routes or mocks: both POSTs must reach the running FastAPI service.
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/analyze') && response.request().method() === 'POST');
  await page.goto('/');
  expect((await responsePromise).status()).toBe(200);
  await expect(page.getByRole('article')).toContainText('HIGH');
  await expect(page.locator('.react-flow__edge')).toHaveCount(15);
  await page.getByLabel('Synthetic JSON records').setInputFiles(path.resolve('../backend/app/samples/compromise.json'));
  await expect(page.getByText('compromise.json · 8 records ready')).toBeVisible();
  const uploadedResponse = page.waitForResponse((response) => response.url().endsWith('/api/analyze') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Analyze upload' }).click();
  const response = await uploadedResponse;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toHaveProperty('records');
  await expect(page.getByRole('article')).toContainText('HIGH');
  await expect(page.getByRole('list', { name: 'Chronological events' }).getByRole('button')).toHaveCount(8);
  await expect(page.locator('.react-flow__edge')).toHaveCount(15);
});
