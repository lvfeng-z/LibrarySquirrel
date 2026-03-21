import log from './util/LogUtil.ts'
import { Session } from 'electron'

/**
 * 设置 CSP 策略
 * @param targetSession
 * @param {boolean} allowUnsafeEval - 是否允许 unsafe-eval
 */
export function setupCSP(targetSession: Session, allowUnsafeEval: boolean) {
  // 移除该特定 Session 上之前可能存在的监听器 (防止重复注册)
  targetSession.webRequest.onHeadersReceived(null)

  // 仅为传入的 targetSession 设置监听器
  targetSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
      const cspDirectives = [
        "default-src 'self'",
        `script-src 'self'${allowUnsafeEval ? " 'unsafe-eval'" : ''}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ]

      const cspString = cspDirectives.join('; ')

      log.info('CSP', `为特定会话应用策略 (unsafe-eval: ${allowUnsafeEval ? '允许' : '禁止'}):`, cspString)

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [cspString]
        }
      })
    } else {
      callback({ responseHeaders: details.responseHeaders })
    }
  })
}
