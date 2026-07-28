import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // dist/ 를 그대로 열어도 동작하도록 상대경로 빌드 (발표장 오프라인 대비)
  base: './',
  // Permit temporary public tunnels while retaining Vite's host-header protection.
  // PORT 환경변수가 있으면 그 포트를 쓴다 (에디터 프리뷰가 포트를 지정해 띄울 수 있게).
  server: {
    allowedHosts: ['.ngrok-free.app'],
    ...(process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {}),
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
