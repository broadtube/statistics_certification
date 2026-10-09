import type { Page } from '@playwright/test';

export const BASE = '/stats-pre1/';

/** 表示中の問題に（正誤は問わず）解答を入力する */
export async function fillAnyAnswer(page: Page, numeric = '1'): Promise<void> {
  await page.locator('.question').first().waitFor();
  const input = page.locator('.numeric input');
  if (await input.count()) await input.fill(numeric);
  else await page.locator('label.choice').first().click();
}
