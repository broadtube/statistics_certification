import { describe, expect, it } from 'vitest';
import { fillPlaceholders } from '../../src/lib/template';

describe('差し込み記号の置換', () => {
  it('値に置き換える（空白を含む記法も可）', () => {
    expect(fillPlaceholders('n={{n}}, p={{ p }}', { n: '10', p: '0.3' })).toBe('n=10, p=0.3');
  });
  it('HTMLとして安全な文字列にエスケープできる', () => {
    expect(fillPlaceholders('{{x}}', { x: '<b>' }, { escapeHtml: true })).toBe('&lt;b&gt;');
  });
  it('未定義の記号は onMissing に従う', () => {
    expect(fillPlaceholders('{{z}}', {})).toBe('');
    expect(() => fillPlaceholders('{{z}}', {}, { onMissing: 'throw' })).toThrow(/z/);
  });
});
