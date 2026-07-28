import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // dist/ 를 그대로 열어도 동작하도록 상대경로 빌드 (발표장 오프라인 대비)
  base: './',
  // Permit temporary public tunnels while retaining Vite's host-header protection.
  server: { allowedHosts: ['.ngrok-free.app'] },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
