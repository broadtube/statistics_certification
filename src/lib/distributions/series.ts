import type { Point } from '../plot/geometry';
import { sampleFunction } from '../plot/geometry';
import { plotRange, type DistributionDef, type Params } from './registry';

export interface DistributionSeries {
  kind: DistributionDef['kind'];
  range: { min: number; max: number };
  density: Point[];
  cdf: Point[];
}

const MAX_DISCRETE_POINTS = 200;

export function distributionSeries(def: DistributionDef, params: Params): DistributionSeries {
  let range = plotRange(def, params);
  if (def.kind === 'continuous') {
    return {
      kind: def.kind,
      range,
      density: sampleFunction((x) => def.density(x, params), range.min, range.max),
      cdf: sampleFunction((x) => def.cdf(x, params), range.min, range.max),
    };
  }
  if (range.max - range.min > MAX_DISCRETE_POINTS) {
    const mid = Math.round(def.quantile(0.5, params));
    const lo = Math.max(range.min, mid - MAX_DISCRETE_POINTS / 2);
    range = { min: lo, max: lo + MAX_DISCRETE_POINTS };
  }
  const density: Point[] = [];
  const cdf: Point[] = [];
  for (let k = range.min; k <= range.max; k++) {
    density.push({ x: k, y: def.density(k, params) });
    const F = def.cdf(k, params);
    cdf.push({ x: k, y: F }, { x: k + 1, y: F });
  }
  return { kind: def.kind, range, density, cdf };
}
