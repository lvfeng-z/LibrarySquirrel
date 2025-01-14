import path from 'path'
import PluginDao from '../dao/PluginDao.ts'
import { createDirIfNotExists, getRootDir } from '../util/FileSysUtil.ts'
import Plugin from '../model/entity/Plugin.ts'
import BaseService from './BaseService.ts'
import PluginQueryDTO from '../model/queryDTO/PluginQueryDTO.ts'
import DB from '../database/DB.ts'
import { arrayNotEmpty, isNullish } from '../util/CommonUtil.ts'
import PluginDTO from '../model/dto/PluginDTO.ts'
import LogUtil from '../util/LogUtil.js'
import PluginInstallDTO from '../model/dto/PluginInstallDTO.js'
import { assertNotNullish } from '../util/AssertUtil.js'
import fs from 'fs'
import yaml from 'js-yaml'
import AdmZip from 'adm-zip'
import TaskPluginListenerService from './TaskPluginListenerService.js'
import TaskPluginListener from '../model/entity/TaskPluginListener.js'
import PluginInstallConfig from '../plugin/PluginInstallConfig.js'
import { GlobalVar, GlobalVars } from '../global/GlobalVar.js'

/**
 * 主键查询
 * @param id
 */
export default class PluginService extends BaseService<PluginQueryDTO, Plugin, PluginDao> {
  constructor(db?: DB) {
    super('PluginService', new PluginDao(db), db)
  }

  public async checkInstalled(type: string, author: string, name: string, version: string): Promise<boolean> {
    return this.dao.checkInstalled(type, author, name, version)
  }

  /**
   * 根据id获取插件加载路径
   */
  public async getDTOById(id: number): Promise<PluginDTO> {
    const resourcePath = '/resources/plugins'

    const plugin = await this.dao.getById(id)
    if (isNullish(plugin)) {
      const msg = `加载插件时出错，id: ${id}不可用`
      LogUtil.error('PluginService', msg)
      throw new Error(msg)
    } else {
      const dto = new PluginDTO(plugin)
      dto.loadPath = path.join(
        'file://',
        getRootDir(),
        resourcePath,
        plugin.author as string,
        plugin.name as string,
        plugin.version as string,
        plugin.fileName as string
      )
      return dto
    }
  }

  /**
   * 读取插件安装包
   * @param packagePath
   */
  public loadPluginPackage(packagePath: string): PluginInstallDTO {
    const packageContent = new AdmZip(packagePath)
    const msgPrefix = '读取插件安装包出错，'

    const yamlEntry = packageContent.getEntry(`pluginInfo.yml`)
    assertNotNullish(yamlEntry, this.className, `${msgPrefix}没有获取到必要的安装配置`)
    const yamlContent = yamlEntry.getData().toString('utf8')
    const config: PluginInstallConfig = yaml.load(yamlContent)

    assertNotNullish(config.type, this.className, `${msgPrefix}插件类型不能为空`)
    assertNotNullish(config.author, this.className, `${msgPrefix}插件作者不能为空`)
    assertNotNullish(config.name, this.className, `${msgPrefix}插件名称不能为空`)
    assertNotNullish(config.version, this.className, `${msgPrefix}插件版本不能为空`)
    assertNotNullish(config.fileName, this.className, `${msgPrefix}插件入口文件不能为空`)

    return new PluginInstallDTO({
      type: config.type,
      author: config.author,
      name: config.name,
      version: config.version,
      fileName: config.fileName,
      packagePath: packagePath,
      package: packageContent,
      listeners: config.listeners
    })
  }

  /**
   * 从插件包安装插件
   * @param packagePath
   */
  public async installPlugin(packagePath: string): Promise<void> {
    assertNotNullish(packagePath, this.className, `插件包路径不能为空`)
    try {
      fs.promises.access(packagePath, fs.constants.F_OK)
    } catch (error) {
      LogUtil.error(this.className, `插件包"${packagePath}"不存在`)
      throw error
    }

    const pluginInstallDTO = this.loadPluginPackage(packagePath)

    // 安装路径
    const installPath: string = path.join(
      getRootDir(),
      '/resources/plugins/',
      pluginInstallDTO.author,
      pluginInstallDTO.name,
      pluginInstallDTO.version
    )
    await createDirIfNotExists(installPath)
    pluginInstallDTO.package.extractAllTo(installPath, true)

    const tempPlugin = new Plugin(pluginInstallDTO)
    return this.save(tempPlugin).then((pluginId) => {
      const listeners: string[] = pluginInstallDTO.listeners
      if (arrayNotEmpty(listeners)) {
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
      LogUtil.info(this.className, `已安装插件${pluginInstallDTO.author}.${pluginInstallDTO.name}.${pluginInstallDTO.version}`)
    })
  }

  /**
   * 预装插件
   */
  public async preInstallPlugins() {
    const defaultPlugins = GlobalVar.get(GlobalVars.APP_CONFIG).plugins
    for (const defaultPlugin of defaultPlugins) {
      let packagePath: string
      if (defaultPlugin.pathType === 'Relative') {
        const NODE_ENV = process.env.NODE_ENV
        if (NODE_ENV == 'development') {
          packagePath = path.join(getRootDir(), '/resources/', defaultPlugin.packagePath)
        } else {
          packagePath = path.join(getRootDir(), '/resources/app.asar.unpacked/resources/', defaultPlugin.packagePath)
        }
      } else {
        packagePath = defaultPlugin.packagePath
      }
      const installDTO = this.loadPluginPackage(packagePath)
      const localPluginInstalled = await this.checkInstalled(installDTO.type, installDTO.author, installDTO.name, installDTO.version)
      if (!localPluginInstalled) {
        let installPath: string
        if (defaultPlugin.pathType === 'Relative') {
          const NODE_ENV = process.env.NODE_ENV
          if (NODE_ENV == 'development') {
            installPath = path.join(getRootDir(), '/resources/', defaultPlugin.packagePath)
          } else {
            installPath = path.join(getRootDir(), '/resources/app.asar.unpacked/resources/', defaultPlugin.packagePath)
          }
        } else {
          installPath = defaultPlugin.packagePath
        }
        try {
          this.installPlugin(installPath).catch((error) => LogUtil.error(this.className, '安装插件失败', error))
        } catch (error) {
          LogUtil.error(this.className, '安装插件失败', error)
        }
      }
    }
  }
}
