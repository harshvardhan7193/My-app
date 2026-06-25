import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Default `/` for Vercel — absolute asset URLs work on every SPA route
// (/profile, /admin, etc.). Relative `./` breaks there because the browser
// resolves assets against the current path and requests /profile/assets/…
// which 404s as HTML (MIME type error).
// Flutter offline bundle: build with VITE_BASE=./ (see scripts/copy-www-to-flutter.ps1).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
});
