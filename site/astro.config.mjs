// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

const site = 'https://mcp-tool-shop-org.github.io';
const base = '/role-os';
const ogImage = `${site}${base}/og.png`;

// https://astro.build/config
export default defineConfig({
  site,
  base,
  integrations: [
    starlight({
      title: 'Role OS',
      favicon: '/favicon.svg',
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: ogImage } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: ogImage } },
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/mcp-tool-shop-org/role-os' },
      ],
      sidebar: [
        { label: 'Handbook', items: [{ autogenerate: { directory: 'handbook' } }] },
      ],
      customCss: ['./src/styles/starlight-custom.css'],
      disable404Route: true,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
