import SiteService from '../service/SiteService.js'
import Site from '../model/entity/Site.js'
import PluginService from '../service/PluginService.js'
import { GlobalVar, GlobalVars } from './GlobalVar.js'
import path from 'path'
import { RootDir } from '../util/FileSysUtil.js'
import { RESOURCE_PATH } from '../constant/CommonConstant.js'
import LogUtil from '../util/LogUtil.js'
import { ArrayNotEmpty } from '../util/CommonUtil.js'

export async function Initialize() {
  const appConfig = GlobalVar.get(GlobalVars.APP_CONFIG)

  // 初始化站点
  const defaultSiteConfigs = appConfig.sites
  const siteNames = defaultSiteConfigs.map((siteConfig) => siteConfig.name)
  const siteService = new SiteService()
  const existingSites = await siteService.listByNames(siteNames)
  const notExistingSites = defaultSiteConfigs
    .filter((defaultSite) => !existingSites.some((existingSite) => existingSite.siteName === defaultSite.name))
    .map((siteConfig) => {
      const tempSite = new Site()
      tempSite.siteName = siteConfig.name
      tempSite.siteDescription = siteConfig.description
      return tempSite
    })
  if (ArrayNotEmpty(notExistingSites)) {
    await siteService.saveBatch(notExistingSites)
  }

  // 初始化插件
  const pluginService = new PluginService()

  const defaultPlugins = appConfig.plugins
  for (const defaultPlugin of defaultPlugins) {
    let packagePath: string
    if (defaultPlugin.pathType === 'Relative') {
      packagePath = path.join(RootDir(), RESOURCE_PATH, defaultPlugin.packagePath)
    } else {
      packagePath = defaultPlugin.packagePath
    }
    const installDTO = pluginService.loadPluginPackage(packagePath)
    const localPluginInstalled = await pluginService.checkInstalled(
      installDTO.type,
      installDTO.author,
      installDTO.name,
      installDTO.version
    )
    if (!localPluginInstalled) {
      let installPath: string
      if (defaultPlugin.pathType === 'Relative') {
        installPath = path.join(RootDir(), RESOURCE_PATH, defaultPlugin.packagePath)
      } else {
        installPath = defaultPlugin.packagePath
      }
      try {
        await pluginService.install(installPath)
        // TODO 把预装插件的域名自动关联到站点上
      } catch (error) {
        LogUtil.error('Initialize', '安装插件失败', error)
      }
    }
  }
}
