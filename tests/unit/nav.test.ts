import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, isCurrent } from '../../src/lib/nav';

describe('共通ナビゲーション', () => {
  it('要件1.5の7画面へのリンクを持つ', () => {
    expect(NAV_ITEMS.map((n) => n.label)).toEqual(['ダッシュボード', '分野マップ', '公式', '分布', '演習', '復習', '計算機']);
  });
  it('サブパス配下で現在地を判定する', () => {
    expect(isCurrent('/sp/', '/sp/', '')).toBe(true);
    expect(isCurrent('/sp/', '/sp/topics/', '')).toBe(false);
    expect(isCurrent('/sp/', '/sp/topics/regression/', 'topics/')).toBe(true);
    expect(isCurrent('/', '/formulas/', 'formulas/')).toBe(true);
  });
});
