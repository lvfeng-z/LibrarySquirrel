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

    // 从配置文件读取插件信息
    try {
      const packageContent = new AdmZip(packagePath)
      const yamlEntry = packageContent.getEntry('localTaskHandler/pluginInfo.yml')
      const yamlContent = yamlEntry.getData().toString('utf8')
      const config = yaml.load(yamlContent)

      const pluginInstallDTO = new PluginInstallDTO(undefined, packagePath)
      pluginInstallDTO.type = config.type
      pluginInstallDTO.author = config.author
      pluginInstallDTO.name = config.name
      pluginInstallDTO.version = config.version
      pluginInstallDTO.fileName = config.fileName

      const msgPrefix = `安装插件${pluginInstallDTO.author}.${pluginInstallDTO.name}.${pluginInstallDTO.version}时，`
      assertNotNullish(pluginInstallDTO.author, this.className, `${msgPrefix}插件作者名称不能为空`)
      assertNotNullish(pluginInstallDTO.name, this.className, `${msgPrefix}插件名称不能为空`)
      assertNotNullish(pluginInstallDTO.version, this.className, `${msgPrefix}插件版本不能为空`)

      // 安装路径
      const installPath: string = path.join(
        getRootDir(),
        '/resources/plugins/',
        pluginInstallDTO.author,
        pluginInstallDTO.name,
        pluginInstallDTO.version
      )
      await createDirIfNotExists(installPath)
      packageContent.extractAllTo(installPath, true)

      return this.save(pluginInstallDTO).then((pluginId) => {
        const listeners: string[] = config.listeners
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
    } catch (e) {
      LogUtil.error(this.className, String(e))
      throw e
    }
  }
}
