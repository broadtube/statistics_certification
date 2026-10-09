export interface NavItem {
  href: string;
  label: string;
}

/** 共通ナビゲーション（要件1.5） */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '', label: 'ダッシュボード' },
  { href: 'topics/', label: '分野マップ' },
  { href: 'formulas/', label: '公式' },
  { href: 'distributions/', label: '分布' },
  { href: 'practice/', label: '演習' },
  { href: 'review/', label: '復習' },
  { href: 'calculator/', label: '計算機' },
];

/** 現在のパスがナビ項目に該当するか（ダッシュボードは完全一致） */
export function isCurrent(base: string, pathname: string, href: string): boolean {
  const b = base.endsWith('/') ? base : `${base}/`;
  const rel = pathname.startsWith(b) ? pathname.slice(b.length) : pathname.replace(/^\//, '');
  if (href === '') return rel === '' || rel === 'index.html';
  return rel.startsWith(href);
}
