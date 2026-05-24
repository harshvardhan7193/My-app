import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import generateFirebaseSW from './generate-sw.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), generateFirebaseSW()],
})
