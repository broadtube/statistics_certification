import { DISTRIBUTIONS } from './registry';

/** 数値計算（PMF/PDF・CDF・分位点）が実装されている分布ID。対話型分布の検証に用いる */
export const IMPLEMENTED_DISTRIBUTIONS: ReadonlySet<string> = new Set(Object.keys(DISTRIBUTIONS));
