import Path from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': Path.resolve('src/renderer/src')
      }
    },
    plugins: [vue()]
  }
})
