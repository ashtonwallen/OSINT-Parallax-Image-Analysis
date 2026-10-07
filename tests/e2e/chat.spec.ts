import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
test('follow-up supports context, retries, local history and report exports', async ({ page }) => {
  await page.goto('./settings');
  await page.getByRole('combobox', { name: 'Provider', exact: true }).selectOption('openai');
  await page.getByPlaceholder('Enter your API key').fill('dummy-chat-key');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('link', { name: 'Back to investigation' }).click();
  await page.getByRole('button', { name: /The afternoon square/ }).click();
  await expect(
    page.getByRole('img', { name: 'Current investigation source', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Visual clues' }).click();
  let calls = 0;
  await page.route('**/api/chat', (route) => {
    const body = route.request().postDataJSON();
    expect(body.image.length).toBeGreaterThan(100);
    expect(body.conversation.findings.clues).toHaveLength(6);
    expect(body.conversation.synthetic).toBe(true);
    expect(body.provider).toBe('openai');
    calls++;
    if (calls === 2)
      return route.fulfill({ status: 429, json: { error: 'Try again in a few minutes.' } });
    expect(body.conversation.messages).toHaveLength(calls === 1 ? 1 : 3);
    return route.fulfill({
      json: {
        reply:
          calls === 1
            ? 'Compare the sign with independent images.'
            : 'Check the letter shapes before inferring a language.',
      },
    });
  });
  await page.getByLabel('Follow-up question').fill('How can I verify the sign?');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('log')).toContainText('Compare the sign with independent images.');
  await page.getByLabel('Follow-up question').fill('Which details?');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.locator('.follow-up').getByRole('alert')).toContainText('Try again');
  await expect(page.getByLabel('Follow-up question')).toHaveValue('Which details?');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('log')).toContainText('Check the letter shapes');
  await page.getByRole('link', { name: 'View report' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  const file = await download;
  const text = await fs.readFile((await file.path())!, 'utf8');
  expect(text).toContain('Which details?');
  expect(text).not.toContain('dummy-chat-key');
  await page.reload();
  await page.locator('.history-open').first().click();
  await page.getByRole('tab', { name: 'Visual clues' }).click();
  await expect(page.getByRole('log')).toContainText('Check the letter shapes');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('category inspection sends a crop, keeps separate history, and preserves category context', async ({
  page,
}) => {
  await page.goto('./settings');
  await page.getByRole('combobox', { name: 'Provider', exact: true }).selectOption('openai');
  await page.getByPlaceholder('Enter your API key').fill('dummy-category-key');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('link', { name: 'Back to investigation' }).click();
  await page.getByRole('button', { name: /The afternoon square/ }).click();
  await expect(
    page.getByRole('img', { name: 'Current investigation source', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Visual clues' }).click();
  const card = page
    .locator('.clue-card')
    .filter({ has: page.locator('summary', { hasText: 'Vegetation & climate' }) });
  await card.locator(':scope > summary').click();
  await card.getByText('Select image region (optional)', { exact: true }).click();
  await card.getByLabel('Left (%)').fill('25');
  await card.getByLabel('Top (%)').fill('25');
  await card.getByLabel('Width (%)').fill('25');
  await card.getByLabel('Height (%)').fill('25');
  let calls = 0;
  await page.route('**/api/chat', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.conversation.category).toBe('Vegetation & climate');
    expect(body.conversation.messages).toHaveLength(++calls === 1 ? 1 : 3);
    expect(body.conversation.messages.at(-1).content).toContain('Only this crop');
    const sharp = (await import('sharp')).default;
    const meta = await sharp(Buffer.from(body.image, 'base64')).metadata();
    expect(meta.width).toBeLessThan(800);
    expect(meta.exif).toBeUndefined();
    await route.fulfill({
      json: {
        reply:
          'Inspect petal arrangement before selecting a genus. Ornamental flowers alone are weak location evidence.',
      },
    });
  });
  await card.getByRole('button', { name: 'Analyse further', exact: true }).click();
  await expect(card.getByRole('log')).toContainText('Ornamental flowers');
  await card
    .getByLabel('Vegetation & climate follow-up question')
    .fill('Which features distinguish the candidates?');
  await card.getByRole('button', { name: 'Send question' }).click();
  await expect(card.locator('.chat-message')).toHaveCount(4);
  await expect(page.getByRole('log', { name: 'Findings conversation', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('link', { name: 'View report' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  expect(await fs.readFile((await (await download).path())!, 'utf8')).toContain(
    'Category: Vegetation & climate',
  );
  await page.reload();
  await page.locator('.history-open').first().click();
  await page.getByRole('tab', { name: 'Visual clues' }).click();
  await card.locator(':scope > summary').click();
  await expect(card.getByRole('log')).toContainText('Ornamental flowers');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('analysis can be cancelled without replacing existing findings', async ({ page }) => {
  await page.goto('./settings');
  await page.getByPlaceholder('Enter your API key').fill('dummy-cancel-test');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('link', { name: 'Back to investigation' }).click();
  await page.getByRole('button', { name: /The afternoon square/ }).click();
  await expect(
    page.getByRole('img', { name: 'Current investigation source', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Visual clues' }).click();
  let release: (() => void) | undefined;
  await page.route('**/api/analyze', async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.abort().catch(() => {});
  });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Analyze visual clues' }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('button', { name: 'Cancel analysis' }).click();
  release!();
  await expect(page.getByRole('button', { name: 'Analyze visual clues' })).toBeEnabled();
  await expect(page.getByText('ILLUSTRATIVE DEMO', { exact: true })).toBeVisible();
});
