/**
 * 设置服务
 */

function getSettings(): object {
  return global.settings.get('workdir')
}

export default {
  getSettings
}
