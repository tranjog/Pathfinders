import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      '@utils': path.resolve(here, 'src/utils'),
      '@types': path.resolve(here, 'src/types'),
      '@hooks': path.resolve(here, 'src/hooks'),
      '@assets': path.resolve(here, 'src/assets'),
      '@components': path.resolve(here, 'src/components'),
      '@services': path.resolve(here, 'src/services'),
      '@store': path.resolve(here, 'src/store'),
      '@constants': path.resolve(here, 'src/constants'),
    },
  },
  server: {
    strictPort: true,
    port: 5173,
  },
})
