import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  root: path('./frontend/'),
  server: { proxy: { '/api': 'http://127.0.0.1:8765' } },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path('./dist/'),
    emptyOutDir: true,
    rolldownOptions: {
      input: Object.fromEntries(
        ['index', 'admin', 'cliente', 'avisos-admin'].map((name) => [
          name,
          path('./frontend/' + name + '.html'),
        ]),
      ),
    },
  },
});
