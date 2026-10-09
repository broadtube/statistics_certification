import IslandBoundary from '../components/IslandBoundary';
import { useMemo, useState } from 'preact/hooks';
import SvgPlot from '../components/plot/SvgPlot';
import ParamInputs from '../components/ParamInputs';
import { defaultParams, getDistribution, validateParams, type Params } from '../lib/distributions/registry';
import { distributionSeries, type DistributionSeries } from '../lib/distributions/series';

interface Props {
  id: string;
  title: string;
}

/** パラメータを操作して PMF/PDF と CDF を再描画する（要件5.3, 5.4） */
function DistributionExplorerInner({ id, title }: Props) {
  const def = getDistribution(id);
  const [raw, setRaw] = useState<Record<string, string>>(() =>
    def ? Object.fromEntries(Object.entries(defaultParams(def)).map(([k, v]) => [k, String(v)])) : {},
  );
  const [lastValid, setLastValid] = useState<{ params: Params; series: DistributionSeries } | null>(() =>
    def ? { params: defaultParams(def), series: distributionSeries(def, defaultParams(def)) } : null,
  );

  const params = useMemo(() => Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.trim() === '' ? Number.NaN : Number(v)])), [raw]);
  const validation = useMemo(() => (def ? validateParams(def, params) : { ok: false as const, errors: [] }), [def, params]);

  if (!def || !lastValid) return <p class="muted">この分布の数値計算には対応していません。</p>;

  const onChange = (name: string, value: string) => {
    const nextRaw = { ...raw, [name]: value };
    setRaw(nextRaw);
    const next = Object.fromEntries(Object.entries(nextRaw).map(([k, v]) => [k, v.trim() === '' ? Number.NaN : Number(v)]));
    if (validateParams(def, next).ok) setLastValid({ params: next, series: distributionSeries(def, next) });
  };

  const { series } = lastValid;
  const label = def.params.map((p) => `${p.label}=${lastValid.params[p.name]}`).join(', ');
  return (
    <div class="explorer">
      <div class="card">
        <ParamInputs specs={def.params} raw={raw} errors={validation.ok ? [] : validation.errors} onChange={onChange} idPrefix={`dist-${id}`} />
        {!validation.ok && <p class="small muted" role="status">有効な値を入力するまで、グラフは直前の値（{label}）のまま表示しています。</p>}
      </div>
      <div class="explorer-plots">
        <figure class="card">
          <figcaption class="small muted">{def.kind === 'discrete' ? '確率関数' : '確率密度関数'}（{label}）</figcaption>
          <SvgPlot kind={def.kind === 'discrete' ? 'stem' : 'line'} points={series.density} xMin={series.range.min} xMax={series.range.max} ariaLabel={`${title}の${def.kind === 'discrete' ? '確率関数' : '確率密度関数'}`} />
        </figure>
        <figure class="card">
          <figcaption class="small muted">累積分布関数（{label}）</figcaption>
          <SvgPlot kind="line" points={series.cdf} xMin={series.range.min} xMax={def.kind === 'discrete' ? series.range.max + 1 : series.range.max} yMax={1.05} ariaLabel={`${title}の累積分布関数`} />
        </figure>
      </div>
    </div>
  );
}

export default function DistributionExplorer(props: Props) {
  return (
    <IslandBoundary name="分布のグラフ">
      <DistributionExplorerInner {...props} />
    </IslandBoundary>
  );
}
