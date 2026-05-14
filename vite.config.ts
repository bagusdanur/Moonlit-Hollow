import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
    },
  },
});
