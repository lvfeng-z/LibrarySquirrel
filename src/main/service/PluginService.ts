import path from 'path'
import PluginDao from '../dao/PluginDao.ts'
import { CreateDirIfNotExists, RootDir } from '../util/FileSysUtil.ts'
import Plugin from '../model/entity/Plugin.ts'
import BaseService from '../base/BaseService.ts'
import PluginQueryDTO from '../model/queryDTO/PluginQueryDTO.ts'
import DB from '../database/DB.ts'
import { ArrayNotEmpty } from '../util/CommonUtil.ts'
import PluginDTO from '../model/dto/PluginDTO.ts'
import LogUtil from '../util/LogUtil.js'
import PluginInstallDTO from '../model/dto/PluginInstallDTO.js'
import { AssertNotBlank, AssertNotNullish } from '../util/AssertUtil.js'
import fs from 'fs'
import yaml from 'js-yaml'
import AdmZip from 'adm-zip'
import TaskPluginListenerService from './TaskPluginListenerService.js'
import TaskPluginListener from '../model/entity/TaskPluginListener.js'
import PluginInstallConfig from '../plugin/PluginInstallConfig.js'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'
import { RESOURCE_PATH } from '../constant/CommonConstant.js'
import { PLUGIN_PACKAGE, PLUGIN_RUNTIME } from '../constant/PluginConstant.js'
import SiteDomainService from './SiteDomainService.js'
import SiteDomain from '../model/entity/SiteDomain.js'

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
  public async getDTOById(id: number): Promise<PluginDTO> {
    const plugin = await this.dao.getById(id)
    AssertNotNullish(plugin, this.constructor.name, `加载插件失败，pluginId: ${id}不可用`)
    const dto = new PluginDTO(plugin)
    AssertNotNullish(plugin.author, `生成插件加载路径失败，插件的作者为空，pluginId: ${id}`)
    AssertNotNullish(plugin.name, `生成插件加载路径失败，插件的名称为空，pluginId: ${id}`)
    AssertNotNullish(plugin.version, `生成插件加载路径失败，插件的版本为空，pluginId: ${id}`)
    AssertNotNullish(plugin.fileName, `生成插件加载路径失败，插件的版本为空，pluginId: ${id}`)
    dto.loadPath = path.join('file://', RootDir(), PLUGIN_RUNTIME, plugin.author, plugin.name, plugin.version, plugin.fileName)
    return dto
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
      fileName: config.fileName,
      packagePath: packagePath,
      package: packageContent,
      domains: config.domains,
      listeners: config.listeners
    })
  }

  /**
   * 从插件包安装插件
   * @param packagePath
   */
  public async install(packagePath: string): Promise<void> {
    AssertNotNullish(packagePath, this.constructor.name, `插件包路径不能为空`)
    try {
      await fs.promises.access(packagePath, fs.constants.F_OK)
    } catch (error) {
      LogUtil.error(this.constructor.name, `安装插件失败，找不到插件包"${packagePath}"`)
      throw error
    }

    const pluginInstallDTO = this.loadPluginPackage(packagePath)

    // 复制安装包
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

    const tempPlugin = new Plugin(pluginInstallDTO)
    return this.save(tempPlugin).then((pluginId) => {
      // 任务创建监听器
      const listeners: string[] = pluginInstallDTO.listeners
      if (ArrayNotEmpty(listeners)) {
        const taskPluginListenerService = new TaskPluginListenerService()
        const taskPluginListeners: TaskPluginListener[] = []
        let taskPluginListener: TaskPluginListener
        for (const listener of listeners) {
          taskPluginListener = new TaskPluginListener()
          taskPluginListener.pluginId = pluginId
          taskPluginListener.listener = listener
          taskPluginListeners.push(taskPluginListener)
        }
        taskPluginListenerService.saveBatch(taskPluginListeners)
      }
      // 域名
      const domains = pluginInstallDTO.domains
      if (ArrayNotEmpty(domains)) {
        const siteDomainService = new SiteDomainService()
        const siteDomains: SiteDomain[] = domains.map((domain) => {
          const tempSiteDomain = new SiteDomain()
          tempSiteDomain.domain = domain.domain
          tempSiteDomain.homepage = domain.homepage
          return tempSiteDomain
        })
        siteDomainService.saveBatch(siteDomains, true)
      }
      LogUtil.info(this.constructor.name, `已安装插件${pluginInstallDTO.author}-${pluginInstallDTO.name}-${pluginInstallDTO.version}`)
    })
  }

  /**
   * 预装插件
   */
  public async preInstall() {
    const defaultPlugins = GlobalVar.get(GlobalVars.APP_CONFIG).plugins
    for (const defaultPlugin of defaultPlugins) {
      let packagePath: string
      if (defaultPlugin.pathType === 'Relative') {
        packagePath = path.join(RootDir(), RESOURCE_PATH, defaultPlugin.packagePath)
      } else {
        packagePath = defaultPlugin.packagePath
      }
      const installDTO = this.loadPluginPackage(packagePath)
      const localPluginInstalled = await this.checkInstalled(installDTO.type, installDTO.author, installDTO.name, installDTO.version)
      if (!localPluginInstalled) {
        let installPath: string
        if (defaultPlugin.pathType === 'Relative') {
          installPath = path.join(RootDir(), RESOURCE_PATH, defaultPlugin.packagePath)
        } else {
          installPath = defaultPlugin.packagePath
        }
        try {
          this.install(installPath).catch((error) => LogUtil.error(this.constructor.name, '安装插件失败', error))
        } catch (error) {
          LogUtil.error(this.constructor.name, '安装插件失败', error)
        }
      }
    }
  }

  /**
   * 重新安装插件
   */
  public async reInstall(pluginId: number) {
    const plugin = await this.getById(pluginId)
    AssertNotNullish(plugin, this.constructor.name, `重新安装插件失败，找不到这个插件，pluginId: ${pluginId}`)
    try {
      await this.unInstall(pluginId)
    } catch (error) {
      if ((error as { code: string }).code !== 'ENOENT') {
        throw error
      }
    }
    AssertNotBlank(plugin.packagePath, this.constructor.name, `重新安装插件失败，找不到这个插件，pluginId: ${pluginId}`)
    return this.install(plugin.packagePath)
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
      throw error
    }
    return this.deleteById(pluginId)
  }
}
