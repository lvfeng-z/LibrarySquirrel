/**
 * 设置服务
 */

/**
 * 全量获取配置
 */
function getSettings(): object {
  return global.settings.get()
}

/**
 * 变更配置
 */
function saveSettings(settings: object) {
  global.settings.set(settings)
}
export default {
  getSettings,
  saveSettings
}
