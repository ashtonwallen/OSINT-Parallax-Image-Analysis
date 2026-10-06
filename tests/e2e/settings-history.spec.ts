import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { demoAnalysis } from '../../src/lib/demo';

test('provider config files round-trip keys and cloud analysis uses the selected provider', async ({
  page,
}) => {
  await page.goto('./settings');
  await page.getByRole('combobox', { name: 'Provider', exact: true }).selectOption('openai');
  await page.getByPlaceholder('Enter your API key').fill('dummy-ui-key-for-test');
  await page.getByLabel('Model ID').fill('vision-test');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save config file (includes keys)' }).click();
  const saved = await download;
  const config = await fs.readFile((await saved.path())!, 'utf8');
  expect(JSON.parse(config).profiles.openai.apiKey).toBe('dummy-ui-key-for-test');
  await page.getByRole('button', { name: 'Clear keys & settings' }).click();
  await page.getByLabel('Import provider config').setInputFiles({
    name: 'config.json',
    mimeType: 'application/json',
    buffer: Buffer.from(config),
  });
  await expect(page.getByRole('combobox', { name: 'Provider', exact: true })).toHaveValue('openai');
  await expect(page.getByPlaceholder('Enter your API key')).toHaveValue('dummy-ui-key-for-test');
  await page.getByRole('button', { name: 'Use provider' }).click();
  await page.getByRole('link', { name: 'Back to investigation' }).click();
  await page.getByRole('button', { name: /The afternoon square/ }).click();
  await expect(
    page.getByRole('img', { name: 'Current investigation source', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Visual clues' }).click();
  let requestBody: Record<string, unknown> = {};
  await page.route('**/api/analyze', async (route) => {
    requestBody = route.request().postDataJSON();
    expect(route.request().headers().authorization).toBe('Bearer dummy-ui-key-for-test');
    await route.fulfill({
      json: {
        ...demoAnalysis.square,
        hypotheses: {
          location: {
            candidates: [
              {
                label: 'Southern Europe (test candidate)',
                likelihood: 'Plausible',
                supportingEvidence: 'Street lettering and masonry.',
                limitations: 'Synthetic scene; features are not exclusive.',
                nextCheck: 'Compare public street imagery.',
              },
            ],
            unresolved: 'No exact location established.',
          },
          captureTime: {
            candidates: [],
            unresolved: 'Calendar date and clock time cannot be established.',
          },
        },
      },
    });
  });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Analyze visual clues' }).click();
  await expect(page.getByText('AI · UNVERIFIED', { exact: true })).toBeVisible();
  expect(requestBody.provider).toBe('openai');
  expect(requestBody.model).toBe('vision-test');
  await expect(page.getByText('Plausible', { exact: true })).toBeVisible();
  await expect(page.getByText('No exact location established.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'View report' }).click();
  const mdDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  const md = await mdDownload;
  const text = await fs.readFile((await md.path())!, 'utf8');
  expect(text).toContain('OpenAI / vision-test');
  expect(text).toContain('Southern Europe (test candidate): Plausible');
  expect(text).toContain('Calendar date and clock time cannot be established.');
  expect(text).not.toContain('dummy-ui-key-for-test');
});

test('local inference connects directly to the configured server', async ({ page }) => {
  await page.goto('./settings');
  await page.getByRole('combobox', { name: 'Provider', exact: true }).selectOption('local');
  await page.getByRole('button', { name: 'Use provider' }).click();
  await page.getByRole('link', { name: 'Back to investigation' }).click();
  await page.getByRole('button', { name: /The afternoon square/ }).click();
  await expect(
    page.getByRole('img', { name: 'Current investigation source', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Visual clues' }).click();
  let localCalled = false;
  const proxies: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/analyze')) proxies.push(r.url());
  });
  await page.route('http://localhost:11434/v1/chat/completions', (route) => {
    localCalled = true;
    return route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: { choices: [{ message: { content: JSON.stringify(demoAnalysis.square) } }] },
    });
  });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Analyze visual clues' }).click();
  await expect(page.getByText('AI · UNVERIFIED', { exact: true })).toBeVisible();
  expect(localCalled).toBe(true);
  expect(proxies).toEqual([]);
});

test('new investigation opens file picker and saved investigations survive reload and can be deleted', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: /The afternoon square/ }).click();
  await expect(
    page.getByRole('img', { name: 'Current investigation source', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'View report' }).click();
  await page.getByLabel('05 / Investigator notes').fill('Saved case notes.');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'New investigation', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path.resolve('public/samples/harbor.jpg'));
  await expect(page.getByRole('tab', { name: 'Metadata' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.history-open')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.history-open')).toHaveCount(2);
  await page.locator('.history-open').filter({ hasText: 'square-synthetic.jpg' }).click();
  await expect(page.getByAltText('Current investigation source')).toBeVisible();
  await page.getByRole('link', { name: 'View report' }).click();
  await expect(page.getByLabel('05 / Investigator notes')).toHaveValue('Saved case notes.');
  await page.getByRole('button', { name: 'Delete square-synthetic.jpg', exact: true }).click();
  await page
    .locator('.history-confirm')
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(page.locator('.history-open')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.history-open')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Investigation history' })).toBeVisible();
  await page.getByRole('button', { name: 'Close history' }).click();
  const mobilePicker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'New investigation', exact: true }).click();
  await mobilePicker;
});

test('provider profiles persist across reload and reopening, and clear removes the saved keys', async ({
  page,
  context,
}) => {
  await page.goto('./settings');
  await page.getByRole('combobox', { name: 'Provider', exact: true }).selectOption('openai');
  await page.getByPlaceholder('Enter your API key').fill('dummy-persistent-key');
  await page.getByLabel('Model ID').fill('saved-vision-model');
  await page.getByRole('button', { name: 'Use provider', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Provider', exact: true })).toHaveValue('openai');
  await expect(page.getByLabel('Model ID')).toHaveValue('saved-vision-model');
  await expect(page.getByPlaceholder('Enter your API key')).toHaveValue('dummy-persistent-key');
  const reopened = await context.newPage();
  await reopened.goto('./settings');
  await expect(reopened.getByPlaceholder('Enter your API key')).toHaveValue('dummy-persistent-key');
  await reopened.getByRole('button', { name: 'Clear keys & settings' }).click();
  await reopened.reload();
  await expect(reopened.getByPlaceholder('Enter your API key')).toHaveValue('');
  await expect(reopened.getByRole('combobox', { name: 'Provider', exact: true })).toHaveValue(
    'anthropic',
  );
  await page.reload();
  await expect(page.getByPlaceholder('Enter your API key')).toHaveValue('');
});

test('unavailable browser storage keeps settings usable and reports the save failure', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage unavailable', 'QuotaExceededError');
    };
  });
  await page.goto('./settings');
  await page.getByPlaceholder('Enter your API key').fill('dummy-unsaved-key');
  await page.getByRole('button', { name: 'Use provider', exact: true }).click();
  await expect(
    page.getByText(
      'Settings work in this tab, but browser storage is unavailable. Download a config file to keep them.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Back to investigation' }).click();
  await page.getByRole('link', { name: 'Provider settings', exact: true }).click();
  await expect(page.getByPlaceholder('Enter your API key')).toHaveValue('dummy-unsaved-key');
});
