import SiteService from '../service/SiteService.ts'
import Site from '../model/entity/Site.ts'
import PluginService from '../service/PluginService.ts'
import path from 'path'
import { RootDir } from '../util/FileSysUtil.ts'
import { RESOURCE_PATH } from '../constant/CommonConstant.ts'
import LogUtil from '../util/LogUtil.ts'
import { ArrayNotEmpty } from '../util/CommonUtil.ts'
import { getIniConfig } from './iniConfig.ts'

export async function Initialize() {
  const iniConfig = getIniConfig()

  // 初始化站点
  const defaultSiteConfigs = iniConfig.sites
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

  const defaultPlugins = iniConfig.plugins
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
        await pluginService.installFromPath(installPath)
      } catch (error) {
        LogUtil.error('Initialize', '安装插件失败', error)
      }
    }
  }
}
