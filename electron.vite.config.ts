import Path from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@shared': Path.resolve('src/shared/')
      }
    },
    build: {
      rollupOptions: {
        external: ['webpack', 'vue-loader', 'rimraf']
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': Path.resolve('src/renderer/src'),
        '@shared': Path.resolve('src/shared/'),
        vue: 'vue/dist/vue.esm-bundler.js'
      }
    },
    plugins: [vue()]
  }
})
