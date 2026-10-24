import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      'flow-sdk': path.resolve(__dirname, 'src/flow-sdk.ts'),
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0', // Allow access across local WiFi network (phone/tablet access)
    port: 3000
  }
});
