import { isNullish } from '@shared/util/CommonUtil.ts'
import SiteBrowserManager from './classes/SiteBrowserManager.ts'

let siteBrowserManager: SiteBrowserManager | undefined = undefined

function createSiteBrowserManager(): void {
  if (isNullish(siteBrowserManager)) {
    siteBrowserManager = new SiteBrowserManager()
  }
}

function getSiteBrowserManager(): SiteBrowserManager {
  if (isNullish(siteBrowserManager)) {
    throw new Error('站点浏览器管理器未初始化！')
  }
  return siteBrowserManager
}

export { createSiteBrowserManager, getSiteBrowserManager }
