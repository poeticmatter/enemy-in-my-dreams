/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // One self-contained HTML file, so the playtest build opens with a double-click.
  plugins: [react(), viteSingleFile()],
  test: {
    exclude: [...configDefaults.exclude, '.sim-snapshots/**'],
  },
});
