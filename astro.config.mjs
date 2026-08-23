// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fractalist-system.pages.dev',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
