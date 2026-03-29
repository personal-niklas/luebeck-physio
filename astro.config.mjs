import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://luebeck-physio.de',
  integrations: [sitemap({
    filter: (page) =>
      !page.includes('/danke/') &&
      !page.includes('/datenschutz/') &&
      !page.includes('/impressum/') &&
      !page.includes('/intern/'),
  })],
  server: { port: 4322 },
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
