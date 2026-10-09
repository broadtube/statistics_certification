// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://example.github.io',
  base,
  trailingSlash: 'always',
  output: 'static',
  integrations: [preact()],
});
