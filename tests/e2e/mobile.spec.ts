import { expect, test } from '@playwright/test';

const PAGES = ['', 'topics/', 'topics/arma/', 'formulas/', 'formulas/ols-matrix/', 'distributions/', 'distributions/f/', 'practice/?problem=chisq-2x2', 'mock/', 'review/', 'flashcards/', 'calculator/', 'settings/', 'about/'];

for (const p of PAGES) {
  test(`スマートフォン幅で横スクロールが発生しない: /${p}`, async ({ page }) => {
    await page.goto(p);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('スマートフォン幅ではナビゲーションを折り畳む', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('.nav-desktop')).toBeHidden();
  await page.getByText('メニュー').click();
  await expect(page.locator('.nav-mobile').getByRole('link', { name: '計算機' })).toBeVisible();
});
