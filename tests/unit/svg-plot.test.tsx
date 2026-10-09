import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import SvgPlot from '../../src/components/plot/SvgPlot';
import { sampleFunction } from '../../src/lib/plot/geometry';

describe('SvgPlot', () => {
  it('連続関数を曲線で描き、指定区間を塗りつぶす', () => {
    const pts = sampleFunction((x) => Math.exp(-x * x / 2), -3, 3, 61);
    const html = render(<SvgPlot kind="line" points={pts} xMin={-3} xMax={3} shade={{ from: 1, to: 3 }} ariaLabel="正規分布" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="正規分布"');
    expect(html).toContain('class="plot-line"');
    expect(html).toContain('class="plot-shade"');
  });

  it('離散分布は棒で描き、区間内の棒を強調する', () => {
    const pts = [0, 1, 2, 3].map((x) => ({ x, y: 0.25 }));
    const html = render(<SvgPlot kind="stem" points={pts} xMin={0} xMax={3} shade={{ from: 2, to: 3 }} ariaLabel="一様" />);
    expect(html.match(/plot-bar-shade/g)).toHaveLength(2);
    expect(html.match(/class="plot-bar/g)).toHaveLength(4);
  });
});

describe('SvgPlot（複数区間）', () => {
  it('両側の区間をそれぞれ塗りつぶす', () => {
    const pts = sampleFunction((x) => Math.exp(-x * x / 2), -3, 3, 61);
    const html = render(<SvgPlot kind="line" points={pts} xMin={-3} xMax={3} shade={[{ from: -3, to: -2 }, { from: 2, to: 3 }]} ariaLabel="両側" />);
    expect(html.match(/class="plot-shade"/g)).toHaveLength(2);
  });
});
