import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  url: string | null;
}

/** ブラウザ向け配布物に含まれる依存（ビルド専用のツール類は除く） */
const SHIPPED_RUNTIME = ['preact', 'katex', '@preact/signals'];

interface Pkg {
  name?: string;
  version?: string;
  license?: string | { type?: string };
  homepage?: string;
  repository?: string | { url?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPkg(root: string, name: string): Pkg | null {
  const p = join(root, 'node_modules', name, 'package.json');
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Pkg) : null;
}

function repoUrl(pkg: Pkg): string | null {
  if (pkg.homepage) return pkg.homepage;
  const r = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  return r ? r.replace(/^git\+/, '').replace(/\.git$/, '') : null;
}

export function collectLicenses(root: string): LicenseEntry[] {
  const own = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Pkg;
  const stdlib = Object.keys({ ...own.dependencies, ...own.devDependencies }).filter((n) => n.startsWith('@stdlib/'));
  const names = [...new Set([...SHIPPED_RUNTIME, ...stdlib])];
  const out: LicenseEntry[] = [];
  for (const name of names) {
    const pkg = readPkg(root, name);
    if (!pkg) continue;
    const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'UNKNOWN');
    out.push({ name, version: pkg.version ?? '', license, url: repoUrl(pkg) });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
