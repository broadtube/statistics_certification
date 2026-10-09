import { expect, test } from '@playwright/test';
import { fillAnyAnswer } from './helpers';

test('エクスポート → 全消去 → インポート（置換・統合）', async ({ page }, testInfo) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto('practice/?problem=odds-ratio');
  await fillAnyAnswer(page);
  await page.getByRole('button', { name: /解答する/ }).click();
  await expect(page.locator('.feedback')).toBeVisible();

  await page.goto('settings/');
  await expect(page.locator('#current + p')).toHaveText(/解答 1 件/);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'JSONファイルをダウンロード' }).click()]);
  const file = testInfo.outputPath('record.json');
  await download.saveAs(file);

  await page.getByRole('button', { name: '学習記録をすべて消去' }).click();
  await expect(page.locator('#current + p')).toHaveText(/解答 0 件/);

  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByRole('button', { name: '現在の記録を置き換える' }).click();
  await expect(page.locator('#current + p')).toHaveText(/解答 1 件/);

  // 同じファイルを統合しても重複しない
  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByRole('button', { name: /統合する/ }).click();
  await expect(page.locator('#current + p')).toHaveText(/解答 1 件/);

  // 不正なファイルでは既存の記録を変更しない
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"other"}') });
  await expect(page.getByRole('alert')).toContainText('このアプリの学習記録ファイルではありません');
  await expect(page.locator('#current + p')).toHaveText(/解答 1 件/);
});
