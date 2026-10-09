import { expect, test } from '@playwright/test';

test('誤答した問題は翌日に復習ページから出題される', async ({ page }) => {
  const t0 = new Date('2026-10-01T10:00:00+09:00');
  await page.clock.setFixedTime(t0);

  await page.goto('practice/?problem=mle-exponential');
  await page.locator('.numeric input').fill('99999');
  await page.getByRole('button', { name: /解答する/ }).click();
  await expect(page.locator('.feedback .alert')).toContainText('不正解');

  await page.goto('review/');
  await expect(page.getByText('今日復習する問題はありません。')).toBeVisible();
  await expect(page.getByText(/次回の復習予定日は 2026\/10\/02/)).toBeVisible();

  await page.clock.setFixedTime(new Date('2026-10-02T09:00:00+09:00'));
  await page.goto('review/');
  await expect(page.getByText('今日の復習: 1 問')).toBeVisible();
  await page.getByRole('button', { name: '復習を始める' }).click();
  await expect(page.locator('.question')).toBeVisible();
  await expect(page.locator('.session-bar')).toContainText('復習');
});
