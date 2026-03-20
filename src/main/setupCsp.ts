import { session } from 'electron'
import LogUtil from './util/LogUtil.ts'

/**
 * 设置 CSP 策略
 * @param {boolean} allowUnsafeEval - 是否允许 unsafe-eval
 */
export function setupCSP(allowUnsafeEval: boolean) {
  // 移除之前设置的所有监听器
  session.defaultSession.webRequest.onHeadersReceived(null)

  // 设置新的 CSP 监听器
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // 只为 HTML 文档设置 CSP（避免为图片、CSS 等资源设置）
    if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
      // 构建 CSP 指令
      const cspDirectives = [
        "default-src 'self'", // 默认只允许同源资源

        // script-src: 根据设置决定是否包含 'unsafe-eval'
        `script-src 'self'${allowUnsafeEval ? " 'unsafe-eval'" : ''}`,

        // style-src: 允许内联样式（保持你原有的设置）
        "style-src 'self' 'unsafe-inline'",

        // img-src: 允许同源和 data URI（保持你原有的设置）
        "img-src 'self' data:",

        // 可选：添加一些额外的安全指令
        "object-src 'none'", // 禁止插件
        "base-uri 'self'", // 限制 base URI
        "form-action 'self'" // 限制表单提交
      ]

      // 合并所有指令
      const cspString = cspDirectives.join('; ')

      LogUtil.info('CSP', `应用策略 (unsafe-eval: ${allowUnsafeEval ? '允许' : '禁止'}):`, cspString)

      // 应用 CSP 头
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [cspString]
        }
      })
    } else {
      // 非 HTML 请求，保持原有响应头
      callback({ responseHeaders: details.responseHeaders })
    }
  })
}
