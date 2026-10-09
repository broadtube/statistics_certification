import { useEffect, useState } from 'preact/hooks';
import { useRecord } from '../lib/client/use-record';
import { url } from '../lib/url';

/** ストレージ利用不可・容量超過・破損復旧の警告（要件11.7） */
export default function StorageBanner() {
  const { store } = useRecord();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (store.status === 'unavailable') {
    return (
      <div class="banner warn" role="status">
        <div class="container">このブラウザでは学習記録を保存できません（プライベートモード等）。閲覧と演習は利用できますが、ページを閉じると記録は失われます。</div>
      </div>
    );
  }
  if (store.status === 'quota-exceeded') {
    return (
      <div class="banner warn" role="status">
        <div class="container">
          ブラウザの保存容量が不足しているため、最新の学習記録を保存できていません。<a href={url('settings/')}>学習記録をエクスポート</a>して保管してください。
        </div>
      </div>
    );
  }
  if (store.recoveredFromCorruption) {
    return (
      <div class="banner warn" role="status">
        <div class="container">保存されていた学習記録が破損していたため、別の場所に退避して新しい記録で開始しました。</div>
      </div>
    );
  }
  return null;
}
