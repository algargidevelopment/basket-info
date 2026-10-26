import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // En desarrollo se sirve desde /; el build usa la subruta del repositorio en GitHub Pages.
  base: command === 'serve' ? '/' : '/basket-info/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
}))
