import type { ParamError, ParamSpec } from '../lib/distributions/registry';
import { rangeText } from '../lib/distributions/registry';

interface Props {
  specs: readonly ParamSpec[];
  raw: Record<string, string>;
  errors: readonly ParamError[];
  onChange(name: string, value: string): void;
  idPrefix: string;
}

/** 分布パラメータの入力（スライダー＋数値入力）。範囲外でも入力自体は受け付け、誤りを表示する */
export default function ParamInputs({ specs, raw, errors, onChange, idPrefix }: Props) {
  return (
    <div class="param-inputs">
      {specs.map((s) => {
        const err = errors.find((e) => e.param === s.name);
        const id = `${idPrefix}-${s.name}`;
        const num = Number(raw[s.name]);
        return (
          <div class="param-row" key={s.name}>
            <label for={id} class="param-label">{s.label}</label>
            <input
              type="range"
              aria-label={`${s.label}（スライダー）`}
              min={s.uiMin}
              max={s.uiMax}
              step={s.step}
              value={Number.isFinite(num) ? Math.min(Math.max(num, s.uiMin), s.uiMax) : s.default}
              onInput={(e) => onChange(s.name, (e.target as HTMLInputElement).value)}
            />
            <input
              id={id}
              type="number"
              inputMode="decimal"
              step={s.step}
              value={raw[s.name] ?? ''}
              aria-invalid={err ? 'true' : undefined}
              aria-describedby={`${id}-hint`}
              onInput={(e) => onChange(s.name, (e.target as HTMLInputElement).value)}
            />
            <span id={`${id}-hint`} class={err ? 'field-error param-hint' : 'muted small param-hint'}>{err ? err.message : rangeText(s)}</span>
          </div>
        );
      })}
    </div>
  );
}
