import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  // GitHub Pages lapa atrodas apakšceļā /<repo>/ — to iestata darbplūsma (.github/workflows/deploy.yml).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5173, open: '/' },
});
