import IslandBoundary from '../components/IslandBoundary';
import { useMemo, useState } from 'preact/hooks';
import SvgPlot from '../components/plot/SvgPlot';
import ParamInputs from '../components/ParamInputs';
import {
  CALCULATOR_DISTRIBUTIONS,
  computeProbabilities,
  computeQuantile,
  formatProbability,
  formatValue,
  type CalculatorDistribution,
} from '../lib/domain/calculator';
import { defaultParams, getDistribution, plotRange, validateParams } from '../lib/distributions/registry';
import { sampleFunction } from '../lib/plot/geometry';

const LABELS: Record<CalculatorDistribution, string> = { normal: '正規分布', t: 't 分布', chisq: 'χ² 分布', f: 'F 分布' };
type Mode = 'prob' | 'quantile';
type Region = 'lower' | 'upper' | 'two';

const toNum = (s: string) => (s.trim() === '' ? Number.NaN : Number(s));

/** 分布表・確率計算機（要件12） */
function CalculatorInner() {
  const [dist, setDist] = useState<CalculatorDistribution>('normal');
  const def = getDistribution(dist)!;
  const [rawParams, setRawParams] = useState<Record<CalculatorDistribution, Record<string, string>>>(() =>
    Object.fromEntries(
      CALCULATOR_DISTRIBUTIONS.map((d) => [d, Object.fromEntries(Object.entries(defaultParams(getDistribution(d)!)).map(([k, v]) => [k, String(v)]))]),
    ) as Record<CalculatorDistribution, Record<string, string>>,
  );
  const [mode, setMode] = useState<Mode>('prob');
  const [xRaw, setXRaw] = useState('1.96');
  const [pRaw, setPRaw] = useState('0.05');
  const [tail, setTail] = useState<'lower' | 'upper'>('upper');
  const [region, setRegion] = useState<Region>('upper');

  const params = useMemo(() => Object.fromEntries(Object.entries(rawParams[dist]).map(([k, v]) => [k, toNum(v)])), [rawParams, dist]);
  const pv = validateParams(def, params);
  const symmetric = dist === 'normal' || dist === 't';
  const center = dist === 'normal' ? (params.mu ?? 0) : 0;

  const probResult = mode === 'prob' ? computeProbabilities(dist, params, toNum(xRaw)) : null;
  const quantResult = mode === 'quantile' ? computeQuantile(dist, params, toNum(pRaw), tail) : null;
  const inputError = (probResult && !probResult.ok ? probResult.error : null) ?? (quantResult && !quantResult.ok ? quantResult.error : null);
  const fieldError = inputError && (inputError.field === 'x' || inputError.field === 'p') ? inputError.message : null;

  const x = mode === 'prob' ? toNum(xRaw) : quantResult?.ok ? quantResult.value : Number.NaN;
  const effRegion: Region = mode === 'quantile' ? tail : region === 'two' && !symmetric ? 'upper' : region;

  const plot = useMemo(() => {
    if (!pv.ok) return null;
    const range = plotRange(def, params);
    const lo = Number.isFinite(x) ? Math.min(range.min, x) : range.min;
    const hi = Number.isFinite(x) ? Math.max(range.max, x) : range.max;
    const points = sampleFunction((t) => def.density(t, params), lo, hi, 400);
    let shade: { from: number; to: number }[] = [];
    if (Number.isFinite(x)) {
      if (effRegion === 'lower') shade = [{ from: lo, to: x }];
      else if (effRegion === 'upper') shade = [{ from: x, to: hi }];
      else {
        const d = Math.abs(x - center);
        shade = [{ from: lo, to: center - d }, { from: center + d, to: hi }];
      }
    }
    return { points, lo, hi, shade };
  }, [pv.ok, def, params, x, effRegion, center]);

  const setParam = (name: string, value: string) => setRawParams({ ...rawParams, [dist]: { ...rawParams[dist], [name]: value } });

  return (
    <div class="calc stack">
      <div class="card stack">
        <div class="chips" role="tablist" aria-label="分布">
          {CALCULATOR_DISTRIBUTIONS.map((d) => (
            <button type="button" role="tab" aria-selected={dist === d} class={`chip ${dist === d ? 'on' : ''}`} onClick={() => setDist(d)}>{LABELS[d]}</button>
          ))}
        </div>
        <ParamInputs specs={def.params} raw={rawParams[dist]} errors={pv.ok ? [] : pv.errors} onChange={setParam} idPrefix={`calc-${dist}`} />
      </div>

      <div class="card stack">
        <div class="row" role="radiogroup" aria-label="計算の種類">
          <label class="row"><input type="radio" name="calc-mode" checked={mode === 'prob'} onChange={() => setMode('prob')} /> 値 → 確率</label>
          <label class="row"><input type="radio" name="calc-mode" checked={mode === 'quantile'} onChange={() => setMode('quantile')} /> 確率 → 分位点</label>
        </div>
        {mode === 'prob' ? (
          <div class="calc-input">
            <label for="calc-x">値 x</label>
            <input id="calc-x" type="text" inputMode="decimal" value={xRaw} aria-invalid={fieldError ? 'true' : undefined} onInput={(e) => setXRaw((e.target as HTMLInputElement).value)} />
            <span class="muted small">塗りつぶし:</span>
            <select value={region} onChange={(e) => setRegion((e.target as HTMLSelectElement).value as Region)} aria-label="塗りつぶす領域">
              <option value="lower">下側 P(X ≤ x)</option>
              <option value="upper">上側 P(X ≥ x)</option>
              {symmetric && <option value="two">両側</option>}
            </select>
          </div>
        ) : (
          <div class="calc-input">
            <label for="calc-p">確率</label>
            <input id="calc-p" type="text" inputMode="decimal" value={pRaw} aria-invalid={fieldError ? 'true' : undefined} onInput={(e) => setPRaw((e.target as HTMLInputElement).value)} />
            <select value={tail} onChange={(e) => setTail((e.target as HTMLSelectElement).value as 'lower' | 'upper')} aria-label="確率の向き">
              <option value="upper">上側 α 点（P(X ≥ x) = α）</option>
              <option value="lower">下側 p 点（P(X ≤ x) = p）</option>
            </select>
          </div>
        )}
        {fieldError && <p class="field-error" role="alert">{fieldError}</p>}

        {probResult?.ok && (
          <table class="calc-result" aria-live="polite">
            <tbody>
              <tr><th scope="row">下側確率 P(X ≤ {xRaw})</th><td>{formatProbability(probResult.value.lower)}</td></tr>
              <tr><th scope="row">上側確率 P(X ≥ {xRaw})</th><td>{formatProbability(probResult.value.upper)}</td></tr>
              {probResult.value.twoSided !== null && (
                <tr><th scope="row">両側確率</th><td>{formatProbability(probResult.value.twoSided)}</td></tr>
              )}
            </tbody>
          </table>
        )}
        {quantResult?.ok && (
          <table class="calc-result" aria-live="polite">
            <tbody>
              <tr>
                <th scope="row">{tail === 'upper' ? `上側 ${pRaw} 点` : `下側 ${pRaw} 点`}</th>
                <td>{formatValue(quantResult.value)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {plot && (
        <figure class="card">
          <figcaption class="small muted">{LABELS[dist]}の確率密度関数（塗りつぶしは指定した確率の領域）</figcaption>
          <SvgPlot
            kind="line"
            points={plot.points}
            xMin={plot.lo}
            xMax={plot.hi}
            shade={inputError ? null : plot.shade}
            markers={Number.isFinite(x) && !inputError ? [{ x, label: formatValue(x).replace(/0+$/, '').replace(/\.$/, '') }] : []}
            ariaLabel={`${LABELS[dist]}の確率密度関数`}
          />
        </figure>
      )}
    </div>
  );
}

export default function Calculator() {
  return (
    <IslandBoundary name="確率計算機">
      <CalculatorInner />
    </IslandBoundary>
  );
}
