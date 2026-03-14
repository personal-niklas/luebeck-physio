import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://luebeck-physio.de',
  integrations: [sitemap()],
  server: { port: 4322 },

  build: {
    inlineStylesheets: 'always',
  },

  vite: {
    build: {
      cssMinify: true,
    },
  },

  adapter: cloudflare(),
});