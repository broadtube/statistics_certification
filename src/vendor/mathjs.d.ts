// mathjs の単一ファイル版（UMD）。ESM版は数千ファイルに分かれており読み込みが遅いため、こちらを使う
declare module 'mathjs/lib/browser/math.js' {
  const mathjs: typeof import('mathjs');
  export default mathjs;
}
