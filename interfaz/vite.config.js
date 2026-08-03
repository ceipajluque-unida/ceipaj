import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_PUERTO ?? 5173),
    // todo lo que empiece con /api va al backend express
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:4000' },
  },
});
