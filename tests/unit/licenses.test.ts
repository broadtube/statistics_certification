import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectLicenses } from '../../build/licenses/collect';

describe('ライセンス一覧', () => {
  const list = collectLicenses(resolve(__dirname, '../..'));

  it('配布物に含まれる依存ライブラリのライセンスを列挙する', () => {
    const names = list.map((l) => l.name);
    expect(names).toEqual(expect.arrayContaining(['preact', 'katex']));
    expect(list.find((l) => l.name === 'preact')?.license).toBe('MIT');
  });

  it('同梱している @stdlib を含める', () => {
    const stdlib = list.filter((l) => l.name.startsWith('@stdlib/'));
    expect(stdlib.length).toBeGreaterThan(10);
    // beta 関数は Boost 由来のコードを含むため "Apache-2.0 AND BSL-1.0"
    expect(stdlib.every((l) => l.license.startsWith('Apache-2.0'))).toBe(true);
  });

  it('名前順に並べ、バージョンを含む', () => {
    expect([...list].map((l) => l.name)).toEqual([...list].map((l) => l.name).sort());
    expect(list.every((l) => /^\d+\.\d+/.test(l.version))).toBe(true);
  });
});
