import type { RenderedProblem } from '../../lib/render/problem';
import type { Problem } from '../../lib/types/problem';

export interface AnswerDraft {
  choiceId: string | null;
  raw: string;
}

interface Props {
  problem: Problem;
  rendered: RenderedProblem;
  number: number;
  total: number;
  draft: AnswerDraft;
  onDraft(d: AnswerDraft): void;
  /** 解答確定後（演習）や採点後（模試）は入力を固定する */
  locked: boolean;
  inputError?: string | null;
  /** 正誤・正答・解説を表示する（演習の解答後、模試の採点後） */
  feedback?: { correct: boolean; answered: boolean } | null;
  /** 数値入力欄で Enter を押したとき */
  onEnter?(): void;
}

const stars = (d: number) => '★'.repeat(d) + '☆'.repeat(3 - d);

export default function QuestionView({ problem, rendered, number, total, draft, onDraft, locked, inputError, feedback, onEnter }: Props) {
  const inputId = `answer-${problem.id}-${number}`;
  return (
    <article class="question card" aria-labelledby={`${inputId}-title`}>
      <header class="row small question-meta">
        <strong id={`${inputId}-title`}>問 {number} / {total}</strong>
        <span class="badge">{problem.type === 'choice' ? '選択式' : '数値入力'}</span>
        <span class="badge" aria-label={`難易度 ${problem.difficulty}`}>{stars(problem.difficulty)}</span>
        <span class="muted">{problem.sourceLabel}</span>
      </header>
      <div class="prose statement" dangerouslySetInnerHTML={{ __html: rendered.statementHtml }} />

      {rendered.choices ? (
        <fieldset class="choices" disabled={locked}>
          <legend class="sr-only">選択肢</legend>
          {rendered.choices.map((c, i) => {
            const isCorrect = feedback && c.id === rendered.correctChoiceId;
            const isWrongPick = feedback && !feedback.correct && draft.choiceId === c.id;
            return (
              <label class={`choice ${draft.choiceId === c.id ? 'selected' : ''} ${isCorrect ? 'is-correct' : ''} ${isWrongPick ? 'is-wrong' : ''}`}>
                <input type="radio" name={inputId} value={c.id} checked={draft.choiceId === c.id} onChange={() => onDraft({ ...draft, choiceId: c.id })} />
                <span class="choice-label" aria-hidden="true">{c.label}</span>
                <span class="choice-body" dangerouslySetInnerHTML={{ __html: c.html }} />
                <span class="kbd choice-key" aria-hidden="true">{i + 1}</span>
              </label>
            );
          })}
        </fieldset>
      ) : (
        <div class="numeric">
          <label for={inputId}>解答（数値）</label>
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={draft.raw}
            disabled={locked}
            aria-invalid={inputError ? 'true' : undefined}
            aria-describedby={`${inputId}-hint`}
            placeholder="例: 1.96"
            onInput={(e) => onDraft({ ...draft, raw: (e.target as HTMLInputElement).value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault();
                onEnter?.();
              }
            }}
          />
          <p id={`${inputId}-hint`} class={inputError ? 'field-error' : 'muted small'} role={inputError ? 'alert' : undefined}>
            {inputError ?? '小数・分数（3/4）・指数表記（1.2e-3）で入力できます。'}
          </p>
        </div>
      )}

      {feedback && (
        <section class="feedback" aria-live="polite">
          <div class={`alert ${feedback.correct ? 'ok' : 'ng'}`}>
            <strong>{feedback.correct ? '正解' : feedback.answered ? '不正解' : '未解答'}</strong>
            <span>　正答: <strong>{rendered.answerDisplay}</strong></span>
            {!feedback.correct && problem.type === 'numeric' && draft.raw.trim() !== '' && <span class="muted">（あなたの解答: {draft.raw}）</span>}
          </div>
          <h3>解説</h3>
          <div class="prose" dangerouslySetInnerHTML={{ __html: rendered.explanationHtml }} />
          {(problem.formulaLinks.length > 0 || problem.topicLinks.length > 0) && (
            <p class="row small related">
              <span class="muted">関連:</span>
              {problem.formulaLinks.map((f) => <a class="badge" href={f.href}>公式: {f.title}</a>)}
              {problem.topicLinks.map((t) => <a class="badge" href={t.href}>要点: {t.title}</a>)}
            </p>
          )}
        </section>
      )}
    </article>
  );
}
