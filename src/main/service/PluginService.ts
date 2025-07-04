import path from 'path'
import PluginDao from '../dao/PluginDao.ts'
import { CreateDirIfNotExists, RootDir } from '../util/FileSysUtil.ts'
import Plugin from '../model/entity/Plugin.ts'
import BaseService from '../base/BaseService.ts'
import PluginQueryDTO from '../model/queryDTO/PluginQueryDTO.ts'
import DB from '../database/DB.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.ts'
import PluginLoadDTO from '../model/dto/PluginLoadDTO.ts'
import LogUtil from '../util/LogUtil.js'
import PluginInstallDTO from '../model/dto/PluginInstallDTO.js'
import { AssertNotBlank, AssertNotNullish, AssertTrue } from '../util/AssertUtil.js'
import fs from 'fs'
import yaml from 'js-yaml'
import AdmZip from 'adm-zip'
import TaskPluginListenerService from './TaskPluginListenerService.js'
import TaskPluginListener from '../model/entity/TaskPluginListener.js'
import PluginInstallConfig from '../plugin/PluginInstallConfig.js'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'
import { PLUGIN_PACKAGE, PLUGIN_RUNTIME } from '../constant/PluginConstant.js'
import SiteDomainService from './SiteDomainService.js'
import SiteDomain from '../model/entity/SiteDomain.js'
import GotoPageConfig from '../model/util/GotoPageConfig.js'
import { PageEnum } from '../constant/PageEnum.js'
import { pathToFileURL } from 'node:url'
import PluginInstallResultDTO from '../model/dto/PluginInstallResultDTO.js'
import SiteService from './SiteService.js'
import lodash from 'lodash'

/**
 * 主键查询
 * @param id
 */
export default class PluginService extends BaseService<PluginQueryDTO, Plugin, PluginDao> {
  constructor(db?: DB) {
    super(PluginDao, db)
  }

  /**
   * 检查插件是否以及安装
   * @param type 类型
   * @param author 作者
   * @param name 名称
   * @param version 版本号
   */
  public async checkInstalled(type: string, author: string, name: string, version: string): Promise<boolean> {
    return this.dao.checkInstalled(type, author, name, version)
  }

  /**
   * 根据作者、名称、版本号获取插件
   */
  public async getByInfo(author: string, name: string, version: string): Promise<Plugin | undefined> {
    const query = new PluginQueryDTO()
    query.author = author
    query.name = name
    query.version = version
    const plugins = await this.list(query)
    if (ArrayNotEmpty(plugins)) {
      return plugins[0]
    } else {
      return undefined
    }
  }

  /**
   * 根据id获取插件加载路径
   */
  public async getDTOById(id: number): Promise<PluginLoadDTO> {
    const plugin = await this.dao.getById(id)
    AssertNotNullish(plugin, this.constructor.name, `加载插件失败，pluginId: ${id}不可用`)
    const loadDTO = new PluginLoadDTO(plugin)
    AssertNotNullish(plugin.author, `生成插件加载路径失败，插件的作者为空，pluginId: ${id}`)
    AssertNotNullish(plugin.name, `生成插件加载路径失败，插件的名称为空，pluginId: ${id}`)
    AssertNotNullish(plugin.version, `生成插件加载路径失败，插件的版本为空，pluginId: ${id}`)
    AssertNotNullish(plugin.fileName, `生成插件加载路径失败，插件的版本为空，pluginId: ${id}`)
    loadDTO.loadPath = pathToFileURL(
      path.join(RootDir(), PLUGIN_RUNTIME, plugin.author, plugin.name, plugin.version, plugin.fileName)
    ).href
    return loadDTO
  }

  /**
   * 根据插件作者、名称、版本查询·
   * @param author
   * @param name
   * @param version
   */
  public async listByAuthorNameVersion(author: string, name: string, version: string): Promise<Plugin[]> {
    AssertNotNullish(author, this.constructor.name, '查询插件失败，作者不能为空')
    AssertNotNullish(name, this.constructor.name, '查询插件失败，插件名称不能为空')
    AssertNotNullish(version, this.constructor.name, '查询插件失败，插件版本不能为空')
    const query = new PluginQueryDTO()
    query.author = author
    query.name = name
    query.version = version
    return this.list(query)
  }

  /**
   * 读取插件安装包
   * @param packagePath
   */
  public loadPluginPackage(packagePath: string): PluginInstallDTO {
    const packageContent = new AdmZip(packagePath)
    const msgPrefix = '读取插件安装包出错，'

    const yamlEntry = packageContent.getEntry(`pluginInfo.yml`)
    AssertNotNullish(yamlEntry, this.constructor.name, `${msgPrefix}没有获取到必要的安装配置`)
    const yamlContent = yamlEntry.getData().toString('utf8')
    const config: PluginInstallConfig = yaml.load(yamlContent)

    AssertNotNullish(config.type, this.constructor.name, `${msgPrefix}插件类型不能为空`)
    AssertNotNullish(config.author, this.constructor.name, `${msgPrefix}插件作者不能为空`)
    AssertNotNullish(config.name, this.constructor.name, `${msgPrefix}插件名称不能为空`)
    AssertNotNullish(config.version, this.constructor.name, `${msgPrefix}插件版本不能为空`)
    AssertNotNullish(config.fileName, this.constructor.name, `${msgPrefix}插件入口文件不能为空`)

    return new PluginInstallDTO({
      type: config.type,
      author: config.author,
      name: config.name,
      version: config.version,
      description: config.description,
      changelog: config.changelog,
      fileName: config.fileName,
      packagePath: packagePath,
      package: packageContent,
      domains: config.domains,
      listeners: config.listeners
    })
  }

  /**
   * 安装插件
   * @param pluginInstallDTO
   */
  public async install(pluginInstallDTO: PluginInstallDTO): Promise<PluginInstallResultDTO> {
    // 校验是否已安装
    const existingList = await this.listByAuthorNameVersion(pluginInstallDTO.author, pluginInstallDTO.name, pluginInstallDTO.version)
    if (ArrayNotEmpty(existingList)) {
      const msg = `安装插件失败，已存在该插件author: ${pluginInstallDTO.author} name: ${pluginInstallDTO.name} version: ${pluginInstallDTO.version}`
      LogUtil.error(this.constructor.name, msg)
      throw new Error(msg)
    }

    // 复制安装包
    const packagePath = pluginInstallDTO.packagePath
    const packageFileName = path.basename(packagePath)
    const backupPath: string = path.join(
      RootDir(),
      PLUGIN_PACKAGE,
      pluginInstallDTO.author,
      pluginInstallDTO.name,
      pluginInstallDTO.version
    )
    const fullBackupPath = path.join(backupPath, packageFileName)
    await CreateDirIfNotExists(backupPath)
    fs.promises.copyFile(packagePath, fullBackupPath)
    pluginInstallDTO.packagePath = fullBackupPath

    // 安装路径
    const installPath: string = path.join(
      RootDir(),
      PLUGIN_RUNTIME,
      pluginInstallDTO.author,
      pluginInstallDTO.name,
      pluginInstallDTO.version
    )
    await CreateDirIfNotExists(installPath)
    pluginInstallDTO.package.extractAllTo(installPath, true)

    return this.db
      .transaction(async (transactionDB) => {
        const tempPlugin = new Plugin(pluginInstallDTO)
        const pluginService = new PluginService(transactionDB)
        const pluginId = await pluginService.save(tempPlugin)

        // 任务创建监听器
        const listeners: string[] = pluginInstallDTO.listeners
        if (ArrayNotEmpty(listeners)) {
          const taskPluginListenerService = new TaskPluginListenerService(transactionDB)
          const taskPluginListeners: TaskPluginListener[] = []
          let taskPluginListener: TaskPluginListener
          for (const listener of listeners) {
            taskPluginListener = new TaskPluginListener()
            taskPluginListener.pluginId = pluginId
            taskPluginListener.listener = listener
            taskPluginListeners.push(taskPluginListener)
          }
          await taskPluginListenerService.saveBatch(taskPluginListeners)
        }
        // 域名
        const domainConfigs = pluginInstallDTO.domains
        if (ArrayNotEmpty(domainConfigs)) {
          const siteDomainService = new SiteDomainService(transactionDB)
          const siteDomains: SiteDomain[] = domainConfigs.map((domain) => {
            const tempSiteDomain = new SiteDomain()
            tempSiteDomain.domain = domain.domain
            tempSiteDomain.homepage = domain.homepage
            return tempSiteDomain
          })
          await siteDomainService.saveBatch(siteDomains, true)

          // 插件的域名关联到站点上
          const bindableConfig = domainConfigs.filter((domain) => NotNullish(domain.site))
          if (ArrayNotEmpty(bindableConfig)) {
            const bindableDomain = bindableConfig.map((domain) => domain.domain)
            const newDomains = await siteDomainService.listByDomains(bindableDomain)
            if (ArrayNotEmpty(newDomains)) {
              const notBindDomains = newDomains.filter((newDomain) => IsNullish(newDomain.siteId))
              if (ArrayNotEmpty(notBindDomains)) {
                const siteNames = bindableConfig.map((domain) => domain.site).filter(NotNullish)
                const siteService = new SiteService(transactionDB)
                const siteList = await siteService.listByNames(siteNames)
                const domainConfigMap = lodash.keyBy(bindableConfig, 'domain')
                const nameSiteMap = lodash.keyBy(siteList, 'siteName')
                notBindDomains.forEach((siteDomain) => {
                  if (NotNullish(siteDomain.domain)) {
                    const tempConfig = domainConfigMap[siteDomain.domain]
                    if (NotNullish(tempConfig.site)) {
                      const targetSite = nameSiteMap[tempConfig.site]
                      siteDomain.siteId = targetSite?.id
                    }
                  }
                })
                await siteDomainService.updateBatchById(notBindDomains)
              }
            }
          }
        }
        LogUtil.info(
          this.constructor.name,
          `已安装插件${pluginInstallDTO.author}-${pluginInstallDTO.name}-${pluginInstallDTO.version}`
        )
        return new PluginInstallResultDTO(tempPlugin, domainConfigs, listeners)
      }, '保存插件、监听器和域名')
      .finally(() => {
        if (!this.injectedDB) {
          this.db.release()
        }
      })
      .then()
  }

  /**
   * 从插件包安装插件
   * @param packagePath
   */
  public async installFromPath(packagePath: string): Promise<PluginInstallResultDTO> {
    AssertNotNullish(packagePath, this.constructor.name, `插件包路径不能为空`)
    try {
      await fs.promises.access(packagePath, fs.constants.F_OK)
    } catch (error) {
      LogUtil.error(this.constructor.name, `安装插件失败，找不到插件包"${packagePath}"`)
      throw error
    }
    return this.install(this.loadPluginPackage(packagePath))
  }

  /**
   * 从插件包安装插件
   * @param packagePath
   */
  public async installAndNotice(packagePath: string) {
    this.installFromPath(packagePath).then((installResult) => {
      const tempDomains = installResult.domains.map((siteDomain) => siteDomain.domain)
      const gotoPageConfig: GotoPageConfig = {
        page: PageEnum.SiteManage,
        title: '插件创建了新的域名',
        content: '建议将新的域名绑定到站点，以免影响插件使用',
        options: {
          confirmButtonText: '去绑定',
          cancelButtonText: '以后再说',
          type: 'warning',
          showClose: false
        },
        extraData: tempDomains
      }
      const mainWindow = GlobalVar.get(GlobalVars.MAIN_WINDOW)
      mainWindow.webContents.send('goto-page', gotoPageConfig)
    })
  }

  /**
   * 重新安装插件
   */
  public async reInstall(pluginId: number) {
    const plugin = await this.getById(pluginId)
    AssertNotNullish(plugin, this.constructor.name, `重新安装插件失败，找不到这个插件，pluginId: ${pluginId}`)
    return this.db.transaction(async () => {
      await this.unInstall(pluginId)
      AssertNotBlank(plugin.packagePath, this.constructor.name, `重新安装插件失败，插件安装包路径不可用，pluginId: ${pluginId}`)
      const installDTO = this.loadPluginPackage(plugin.packagePath)
      this.assertSamePlugin(plugin, installDTO)
      return this.install(installDTO)
    }, '重新安装插件')
  }

  /**
   * 重新安装插件
   */
  public async reInstallFromPath(pluginId: number, packagePath: string) {
    AssertNotBlank(
      packagePath,
      this.constructor.name,
      `重新安装插件失败，给定的安装包路径不可用，pluginId: ${pluginId}，packagePath: ${packagePath}`
    )
    const plugin = await this.getById(pluginId)
    AssertNotNullish(plugin, this.constructor.name, `重新安装插件失败，找不到这个插件，pluginId: ${pluginId}`)
    return this.db.transaction(async () => {
      await this.unInstall(pluginId)
      const installDTO = this.loadPluginPackage(packagePath)
      this.assertSamePlugin(plugin, installDTO)
      return this.install(installDTO)
    }, '重新安装插件')
  }

  /**
   * 卸载插件
   */
  public async unInstall(pluginId: number) {
    const plugin = await this.getById(pluginId)
    AssertNotNullish(plugin, `卸载插件失败，找不到这个插件，pluginId: ${pluginId}`)
    AssertNotNullish(plugin.author, `卸载插件失败，找不到插件所在目录，因为插件的作者为空，pluginId: ${pluginId}`)
    AssertNotNullish(plugin.name, `卸载插件失败，找不到插件所在目录，因为插件的名称为空，pluginId: ${pluginId}`)
    AssertNotNullish(plugin.version, `卸载插件失败，找不到插件所在目录，因为插件的版本为空，pluginId: ${pluginId}`)
    const pluginPath = path.join(RootDir(), PLUGIN_RUNTIME, plugin.author, plugin.name, plugin.version)
    try {
      await fs.promises.rm(pluginPath, { recursive: true })
    } catch (error) {
      LogUtil.error(this.constructor.name, `卸载插件失败，plugin: ${plugin.author}-${plugin.name}-${plugin.version},`, error)
      if ((error as { code: string }).code !== 'ENOENT') {
        throw error
      }
    }
    return this.deleteById(pluginId)
  }

  private assertSamePlugin(plugin1: Plugin, plugin2: Plugin): void {
    AssertTrue(
      plugin1.author === plugin2.author && plugin1.name === plugin2.name && plugin2.version === plugin2.version,
      this.constructor.name,
      `重新安装插件失败，插件[${plugin1.author}-${plugin1.name}-${plugin1.version}]与插件[${plugin2.author}-${plugin2.name}-${plugin2.version}]不符`
    )
  }
}
