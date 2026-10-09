import { describe, expect, it } from 'vitest';
import { joinBase } from '../../src/lib/url';

describe('joinBase', () => {
  it('ルート配下ではそのままのパスを返す', () => {
    expect(joinBase('/', 'topics/')).toBe('/topics/');
  });
  it('サブパス配下ではサブパスを前置する', () => {
    expect(joinBase('/stats-pre1/', '/topics/regression/')).toBe('/stats-pre1/topics/regression/');
    expect(joinBase('/stats-pre1', 'data/problems/index.json')).toBe('/stats-pre1/data/problems/index.json');
  });
});
