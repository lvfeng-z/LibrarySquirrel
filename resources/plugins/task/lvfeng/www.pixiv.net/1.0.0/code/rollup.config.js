import resolve from '@rollup/plugin-node-resolve'

export default {
  input: 'src/pixivTaskHandler.mjs', // 入口文件
  output: [
    {
      file: 'pixivTaskHandler_product.mjs', // 输出文件路径
      format: 'es', // 输出格式
      sourcemap: true // 生成源码映射
    }
  ],
  plugins: [
    resolve({ extensions: ['.mjs', '.js'] }) // 同时解析ES6模块和CommonJS模块的导入
  ]
}