import { describe, expect, it } from 'vitest';
import { layoutDiagram } from '../../build/site/diagram';

describe('分布の関係図のレイアウト', () => {
  const nodes = [
    { id: 'a', title: 'A', x: 0, y: 0 },
    { id: 'b', title: 'B', x: 2, y: 1 },
  ];
  const edges = [{ from: 'a', to: 'b', label: 'n→∞' }, { from: 'a', to: 'ghost', label: 'x' }];

  it('格子座標をピクセル座標に変換し、全ノードが収まる大きさを返す', () => {
    const d = layoutDiagram(nodes, edges);
    const a = d.nodes.find((n) => n.id === 'a')!;
    const b = d.nodes.find((n) => n.id === 'b')!;
    expect(b.cx).toBeGreaterThan(a.cx);
    expect(b.cy).toBeGreaterThan(a.cy);
    expect(d.width).toBeGreaterThanOrEqual(b.cx + b.w / 2);
    expect(d.height).toBeGreaterThanOrEqual(b.cy + b.h / 2);
  });

  it('存在するノード間の辺だけを、ノードの枠の外側から引く', () => {
    const d = layoutDiagram(nodes, edges);
    expect(d.edges).toHaveLength(1);
    const e = d.edges[0]!;
    const a = d.nodes[0]!;
    expect(Math.abs(e.x1 - a.cx) <= a.w / 2 + 3 && Math.abs(e.y1 - a.cy) <= a.h / 2 + 3).toBe(true);
    expect(e.x1 === a.cx && e.y1 === a.cy).toBe(false);
    expect(e.label).toBe('n→∞');
  });
});
