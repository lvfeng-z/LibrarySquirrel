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
        external: ['webpack', 'vue-loader', 'rimraf'],
        input: {
          index: 'src/main/index.ts',
          'database-worker': 'src/main/core/workers/databaseWorker.ts',
          'task-worker': 'src/main/core/workers/taskWorkerEntry.ts'
        },
        output: {
          manualChunks: (id) => {
            // 将 DbProxy 单独打包为一个 chunk，避免进入主线程 bundle
            if (id.includes('DbProxy.ts') || id.includes('DbProxy.js')) {
              return 'db-proxy'
            }
            // 将 Service 目录单独打包为一个 chunk
            if (id.includes('src/main/service')) {
              return 'service'
            }
            return undefined
          }
        }
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
