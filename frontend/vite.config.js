import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the Vite build loads from file:// when bundled in the APK.
export default defineConfig({
  plugins: [react()],
  base: './',
});
