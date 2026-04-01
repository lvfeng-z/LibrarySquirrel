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
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          // 匹配所有以 '/api' 开头的请求路径
          target: 'http://localhost:8080', // 你的后端服务地址
          changeOrigin: true // 修改请求头中的 Origin 为目标地址
          // rewrite: (path) => path.replace(/^\/api/, '') // 如果后端接口不需要 /api 前缀，可以取消注释
        }
      }
    }
  }
})
