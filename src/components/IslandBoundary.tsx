import type { ComponentChildren } from 'preact';
import { useErrorBoundary } from 'preact/hooks';

interface Props {
  /** 利用者に示す部品名（例: 演習） */
  name: string;
  children: ComponentChildren;
}

/** アイランド単位でエラーを捕捉し、他の部分の動作を妨げないようにする */
export default function IslandBoundary({ name, children }: Props) {
  const [error] = useErrorBoundary((e: unknown) => console.error(`[${name}]`, e));
  if (error) {
    return (
      <div class="alert ng" role="alert">
        <p>{name}の表示中にエラーが発生しました。ページの他の部分は引き続き利用できます。</p>
        <button type="button" class="btn small" onClick={() => window.location.reload()}>この部品を再読み込み</button>
      </div>
    );
  }
  return <>{children}</>;
}
