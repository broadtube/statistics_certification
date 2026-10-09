import { expect, test } from '@playwright/test';
import { BASE } from './helpers';

const PAGES = ['', 'topics/', 'formulas/', 'distributions/', 'topics/linear-regression/', 'distributions/normal/', 'about/'];

test('サブパス配下で全ての内部リンクが解決される', async ({ page, request }) => {
  const links = new Set<string>();
  for (const p of PAGES) {
    await page.goto(p);
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const h of hrefs) {
      if (/^(https?:|mailto:|#)/.test(h)) continue;
      expect(h.startsWith(BASE), `${p} のリンク ${h} がサブパスで始まっていない`).toBe(true);
      links.add(h.split('#')[0] ?? h);
    }
  }
  for (const href of links) {
    const res = await request.get(`http://localhost:4322${href}`);
    expect(res.status(), href).toBe(200);
  }
});

test('存在しないURLでは分野マップへの導線を含むエラーページを表示する', async ({ page }) => {
  const res = await page.goto('no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
  await expect(page.getByRole('link', { name: '分野マップへ' })).toHaveAttribute('href', `${BASE}topics/`);
});
