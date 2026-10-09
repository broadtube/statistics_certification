import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { collectLicenses } from '../licenses/collect';

const root = resolve('.');
const list = collectLicenses(root);
mkdirSync(resolve('src/generated'), { recursive: true });
writeFileSync(resolve('src/generated/licenses.json'), `${JSON.stringify(list, null, 2)}\n`);
console.log(`ライセンス一覧を生成しました（${list.length} 件）: src/generated/licenses.json`);
