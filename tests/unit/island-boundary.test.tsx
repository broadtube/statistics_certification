// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { describe, expect, it, vi } from 'vitest';
import IslandBoundary from '../../src/components/IslandBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('画面部品ごとのエラー捕捉', () => {
  it('子でエラーが起きても再読み込み手段を表示し、詳細をコンソールに出力する', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const root = document.createElement('div');
    act(() => {
      render(<IslandBoundary name="演習"><Boom /></IslandBoundary>, root);
    });
    expect(root.textContent).toContain('演習');
    expect(root.querySelector('button')?.textContent).toContain('再読み込み');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('エラーがなければ子をそのまま表示する', () => {
    const root = document.createElement('div');
    act(() => {
      render(<IslandBoundary name="x"><p>ok</p></IslandBoundary>, root);
    });
    expect(root.innerHTML).toBe('<p>ok</p>');
  });
});
