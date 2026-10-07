import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import AxeBuilder from '@axe-core/playwright';
test('demo, tool navigation, exports and mobile layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Image analysis' })).toBeVisible();
  await page.getByRole('button', { name: /The afternoon square/ }).click();
  await expect(page.getByText('square-synthetic.jpg', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('No readable camera or editing metadata.')).toBeVisible();
  await page.getByRole('tab', { name: 'Visual clues' }).click();
  await expect(page.getByText('6 OBSERVATIONS')).toBeVisible();
  await expect(page.getByText('No provider configured')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshot.png', fullPage: true });
  await page.getByRole('tab', { name: 'Reverse search' }).click();
  await page
    .getByPlaceholder('https://example.com/image.jpg')
    .fill('https://example.com/a.jpg?x=1&y=2');
  await expect(page.getByRole('link', { name: /Google Lens/ })).toHaveAttribute(
    'href',
    /uploadbyurl\?url=https%3A%2F%2Fexample/,
  );
  await page.getByRole('tab', { name: 'Chronolocation' }).click();
  await expect(page.getByRole('button', { name: 'Estimate time window' })).toBeDisabled();
  await page.getByText('Or enter normalized points with a keyboard').click();
  await page.getByRole('button', { name: 'Initialize editable points' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Estimate time window' }).click();
  await expect(page.getByText('CANDIDATE MATCH · NOT A CAPTURE TIME')).toBeVisible();
  await page.getByRole('link', { name: 'View report' }).click();
  await expect(
    page.getByRole('heading', { name: 'Verification report', exact: true, level: 1 }),
  ).toBeVisible();
  await page
    .getByLabel('05 / Investigator notes')
    .fill('Source reviewed: https://example.com\nUnconfirmed hypothesis.');
  const mdDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  const md = await mdDownload;
  const content = await fs.readFile((await md.path())!, 'utf8');
  expect(content).toContain('Source reviewed: https://example.com');
  expect(content).toContain('Self-generated synthetic demo');
  expect(content).toContain('Best match:');
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const pdf = await pdfDownload;
  await pdf.saveAs('test-results/report.pdf');
  const bytes = await fs.readFile((await pdf.path())!);
  expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
  expect(bytes.length).toBeGreaterThan(10000);
  await page.getByRole('link', { name: 'Back to investigation' }).click();
  await page.getByRole('button', { name: /A quiet northern harbor/ }).click();
  await page.getByRole('tab', { name: 'Visual clues' }).click();
  await expect(page.getByText('No legible signage is visible.')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
test('local upload never posts image data and rejects invalid files', async ({ page, request }) => {
  const posts: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request.url());
  });
  await page.goto('./');
  await page
    .getByLabel('Upload investigation image')
    .setInputFiles(path.resolve('public/samples/square.jpg'));
  await expect(page.getByText('square.jpg', { exact: true }).last()).toBeVisible();
  expect(posts).toEqual([]);
  await page.getByLabel('Upload investigation image').setInputFiles({
    name: 'invalid.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  });
  await expect(page.getByRole('alert').filter({ hasText: 'Choose a JPEG' })).toContainText(
    'Choose a JPEG, PNG or WebP',
  );
  const response = await request.post('./api/analyze', { data: { image: 'fake' } });
  expect(response.status()).toBe(401);
  const og = await request.get('./opengraph-image');
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('extracts camera, date, software and GPS from a real EXIF fixture', async ({ page }) => {
  const buffer = await sharp({
    create: { width: 320, height: 240, channels: 3, background: '#718a59' },
  })
    .jpeg()
    .withExif({
      IFD0: { Make: 'Parallax Test', Model: 'Fixture Camera', Software: 'Fixture Generator' },
      IFD2: { DateTimeOriginal: '2024:06:21 12:30:00' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '38/1 42/1 36/1',
        GPSLongitudeRef: 'W',
        GPSLongitude: '9/1 8/1 6/1',
      },
    })
    .toBuffer();
  const mapRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('openstreetmap')) mapRequests.push(request.url());
  });
  await page.goto('./');
  await page
    .getByLabel('Upload investigation image')
    .setInputFiles({ name: 'exif-fixture.jpg', mimeType: 'image/jpeg', buffer });
  await expect(page.getByText('Fixture Camera', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture Generator', { exact: true })).toBeVisible();
  await expect(page.getByText('2024:06:21 12:30:00', { exact: true })).toBeVisible();
  await expect(page.getByText('38.710000, -9.135000')).toBeVisible();
  expect(mapRequests).toEqual([]);
  await page.route('https://www.openstreetmap.org/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Map fixture</p>' }),
  );
  await page.getByRole('button', { name: 'Load location map' }).click();
  await expect(page.locator('iframe[title="EXIF location map"]')).toBeVisible();
  expect(mapRequests.length).toBe(1);
});

test('workspace has no automated WCAG A/AA accessibility violations', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /The afternoon square/ }).click();
  await expect(page.getByText('No readable camera or editing metadata.')).toBeVisible();
  for (const tab of ['Metadata', 'Reverse search', 'Chronolocation', 'Visual clues']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      tab,
    ).toEqual([]);
  }
});

test('mobile workspace keeps tools before samples and history closes with Escape or a selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Image analysis', exact: true })).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await page.getByRole('button', { name: /The afternoon square/ }).click();
  await expect(page.getByRole('tablist')).toBeVisible();
  const tools = await page.locator('.analysis-column').boundingBox();
  const samples = await page.locator('.sample-browser').boundingBox();
  expect(tools!.y).toBeLessThan(samples!.y);
  await expect(page.locator('.history-open')).toHaveCount(0);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close history', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('complementary', { name: 'Investigation history' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'History', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.locator('.history-open')).toHaveCount(1);
  await page.locator('.history-open').click();
  await expect(page.getByRole('complementary', { name: 'Investigation history' })).toHaveCount(0);
});
