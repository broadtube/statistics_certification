import { expect, test } from '@playwright/test';
import { fillAnyAnswer } from './helpers';

test('模試: 途中で再読み込みしても状態を保持し、時間切れで自動採点される', async ({ page }) => {
  const start = new Date('2026-10-01T10:00:00+09:00');
  await page.clock.setFixedTime(start);
  await page.goto('mock/');
  await page.locator('.card .card', { hasText: 'ミニ模試' }).getByRole('button', { name: '開始する' }).click();
  await expect(page.locator('.mock-clock')).toContainText('40:00');

  await fillAnyAnswer(page, '42');
  await page.getByRole('button', { name: /見直し用にマーク/ }).click();
  await expect(page.locator('.mock-nav-item.current')).toHaveClass(/marked/);
  await expect(page.locator('.mock-nav-item.current')).toHaveClass(/done/);

  // 10分後に再読み込み → 残り時間と解答・マークが保持される
  await page.clock.setFixedTime(new Date(start.getTime() + 10 * 60_000));
  await page.reload();
  await expect(page.locator('.mock-clock')).toContainText('30:00');
  await expect(page.locator('.mock-nav-item').first()).toHaveClass(/done/);
  await expect(page.locator('.mock-nav-item').first()).toHaveClass(/marked/);

  // 終了時刻を過ぎると自動採点
  await page.clock.setFixedTime(new Date(start.getTime() + 41 * 60_000));
  await expect(page.getByRole('heading', { name: '模試の結果' })).toBeVisible();
  await expect(page.locator('.big-score')).toContainText('時間切れで終了');
  expect(await page.evaluate(() => localStorage.getItem('stats-pre1:mock-session'))).toBeNull();
});

test('模試: 提出すると得点と大分類別成績を表示する', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto('mock/');
  await page.locator('.card .card', { hasText: 'ミニ模試' }).getByRole('button', { name: '開始する' }).click();
  await fillAnyAnswer(page);
  await page.getByRole('button', { name: '次へ →' }).click();
  await page.getByRole('button', { name: '提出する' }).click();
  await expect(page.getByRole('heading', { name: '大分類別の成績' })).toBeVisible();
  await expect(page.locator('.mock-review')).toHaveCount(10);
});
