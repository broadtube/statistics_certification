import { expect, test } from '@playwright/test';
import { fillAnyAnswer } from './helpers';

test('分野マップ → 要点 → 分野別演習 → 数値入力で解答 → 解説から公式ページへ', async ({ page }) => {
  await page.goto('topics/');
  await page.getByRole('link', { name: '点推定と最尤法' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '点推定と最尤法' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '主要公式' })).toBeVisible();

  await page.getByRole('link', { name: 'この分野を演習する' }).click();
  await expect(page.locator('.question')).toBeVisible();
  await expect(page.locator('.statement .katex').first()).toBeVisible();

  // 数値入力の問題が出るまで進める（出題順は無作為）
  for (let i = 0; i < 5 && (await page.locator('.numeric input').count()) === 0; i++) {
    await fillAnyAnswer(page);
    await page.getByRole('button', { name: /解答する/ }).click();
    await page.getByRole('button', { name: /次の問題へ|結果を見る/ }).click();
  }
  const input = page.locator('.numeric input');
  await input.fill('abc');
  await page.getByRole('button', { name: /解答する/ }).click();
  await expect(page.locator('.field-error')).toContainText('数値として解釈できません');

  await input.fill('0.001');
  await input.press('Enter');
  await expect(page.locator('.feedback')).toContainText('正答');
  await expect(page.locator('.feedback h3')).toHaveText('解説');

  await page.locator('.feedback a', { hasText: '公式:' }).first().click();
  await expect(page).toHaveURL(/\/stats-pre1\/formulas\/[a-z0-9-]+\/$/);
  await expect(page.getByRole('heading', { name: 'この公式を使う問題' })).toBeVisible();
});

test('存在しない問題を指定すると設定画面で通知する', async ({ page }) => {
  await page.goto('practice/?problem=no-such-problem');
  await expect(page.getByRole('alert')).toContainText('見つかりませんでした');
  await expect(page.getByRole('button', { name: '全分野からランダムに出題' })).toBeVisible();
});
