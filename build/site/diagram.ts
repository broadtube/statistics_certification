export interface DiagramNodeInput {
  id: string;
  title: string;
  /** 格子座標 */
  x: number;
  y: number;
}

export interface DiagramEdgeInput {
  from: string;
  to: string;
  label: string;
}

export interface DiagramNode extends DiagramNodeInput {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lx: number;
  ly: number;
}

const CELL_W = 196;
const CELL_H = 100;
const NODE_W = 118;
const NODE_H = 40;
const MARGIN = 20;

/** 矩形の中心から (dx, dy) 方向へ伸ばした線が矩形の枠と交わる点 */
function boxExit(cx: number, cy: number, w: number, h: number, dx: number, dy: number, gap: number): [number, number] {
  const tx = dx === 0 ? Number.POSITIVE_INFINITY : (w / 2 + gap) / Math.abs(dx);
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : (h / 2 + gap) / Math.abs(dy);
  const t = Math.min(tx, ty);
  return [cx + dx * t, cy + dy * t];
}

export function layoutDiagram(inputNodes: readonly DiagramNodeInput[], inputEdges: readonly DiagramEdgeInput[]) {
  const minX = Math.min(...inputNodes.map((n) => n.x));
  const minY = Math.min(...inputNodes.map((n) => n.y));
  const nodes: DiagramNode[] = inputNodes.map((n) => ({
    ...n,
    cx: MARGIN + NODE_W / 2 + (n.x - minX) * CELL_W,
    cy: MARGIN + NODE_H / 2 + (n.y - minY) * CELL_H,
    w: NODE_W,
    h: NODE_H,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges: DiagramEdge[] = [];
  for (const e of inputEdges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const [x1, y1] = boxExit(a.cx, a.cy, a.w, a.h, dx, dy, 2);
    const [x2, y2] = boxExit(b.cx, b.cy, b.w, b.h, -dx, -dy, 6);
    edges.push({ from: e.from, to: e.to, label: e.label, x1, y1, x2, y2, lx: (x1 + x2) / 2, ly: (y1 + y2) / 2 });
  }
  const width = Math.max(...nodes.map((n) => n.cx + n.w / 2)) + MARGIN;
  const height = Math.max(...nodes.map((n) => n.cy + n.h / 2)) + MARGIN;
  return { nodes, edges, width, height };
}
