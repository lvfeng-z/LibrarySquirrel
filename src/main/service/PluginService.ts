import path from 'path'
import PluginDao from '../dao/PluginDao.ts'
import { CreateDirIfNotExists, RootDir } from '../util/FileSysUtil.ts'
import Plugin from '@shared/model/entity/Plugin.ts'
import BaseService from '../base/BaseService.ts'
import PluginQueryDTO from '@shared/model/queryDTO/PluginQueryDTO.ts'
import { arrayNotEmpty, notNullish } from '@shared/util/CommonUtil.ts'
import LogUtil from '../util/LogUtil.js'
import PluginInstallDTO from '@shared/model/dto/PluginInstallDTO.js'
import { assertArrayNotEmpty, assertNotBlank, assertNotNullish, assertTrue } from '@shared/util/AssertUtil.ts'
import fs from 'fs'
import AdmZip from 'adm-zip'
import { PLUGIN_RUNTIME } from '../constant/PluginConstant.js'
import { BOOL } from '../constant/BOOL.js'
import Page from '@shared/model/util/Page.js'
import BackupService from './BackupService.js'
import { BackupSourceTypeEnum } from '../constant/BackupSourceTypeEnum.js'
import { rm } from 'node:fs/promises'
import { PluginManifest } from '../plugin/types/PluginManifest.ts'
import { getSettings } from '../core/settings.ts'
import { assignExisting } from '@shared/util/ObjectUtil.ts'
import { getPluginManager } from '../core/pluginManager.ts'
import { ActivationType } from '@shared/model/constant/ActivationType.ts'
import { InstallType } from '@shared/model/interface/PluginInstallType.ts'
import { transactional } from '../database/Transactional.ts'

/**
 * 主键查询
 * @param id
 */
export default class PluginService extends BaseService<PluginQueryDTO, Plugin, PluginDao> {
  constructor() {
    super(PluginDao)
  }

  /**
   * 检查插件是否以及安装
   * @param publicId 插件公开id
   */
  public async checkInstalled(publicId: string): Promise<boolean> {
    return this.dao.checkInstalled(publicId)
  }

  /**
   * 根据公开id查询插件
   */
  public async getByPublicId(publicId: string): Promise<Plugin | undefined> {
    const query = new PluginQueryDTO()
    query.publicId = publicId
    return this.get(query)
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
    if (arrayNotEmpty(plugins)) {
      return plugins[0]
    } else {
      return undefined
    }
  }

  /**
   * 根据插件作者、名称、版本查询·
   * @param author
   * @param name
   * @param version
   */
  public async listByAuthorNameVersion(author: string, name: string, version: string): Promise<Plugin[]> {
    assertNotNullish(author, '查询插件失败，作者不能为空')
    assertNotNullish(name, '查询插件失败，插件名称不能为空')
    assertNotNullish(version, '查询插件失败，插件版本不能为空')
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

    const rawEntry = packageContent.getEntry(`plugin.json`)
    assertNotNullish(rawEntry, `${msgPrefix}没有获取到必要的安装配置`)
    const jsonContent = rawEntry.getData().toString('utf8')
    const config: PluginManifest = JSON.parse(jsonContent) as PluginManifest

    assertNotNullish(config.id, `${msgPrefix}插件id不能为空`)
    assertNotNullish(config.name, `${msgPrefix}插件名称不能为空`)
    assertNotNullish(config.version, `${msgPrefix}插件版本不能为空`)
    assertNotNullish(config.author, `${msgPrefix}插件作者不能为空`)
    assertArrayNotEmpty(config.contributes, `${msgPrefix}插件贡献点不能为空`)
    assertNotNullish(config.activation?.type, `${msgPrefix}插件启动类型不能为空`)
    assertNotNullish(config.entryFile, `${msgPrefix}插件入口文件不能为空`)

    return new PluginInstallDTO({
      id: config.id,
      name: config.name,
      version: config.version,
      author: config.author,
      contributes: config.contributes,
      activation: config.activation,
      entryFile: config.entryFile,
      description: config.description,
      packagePath: packagePath,
      package: packageContent
    })
  }

  /**
   * 安装插件
   * @param pluginInstallDTO
   * @param installType
   */
  public async install(pluginInstallDTO: PluginInstallDTO, installType: InstallType): Promise<Plugin> {
    // 校验是否已安装
    assertNotNullish(pluginInstallDTO.publicId, '安装插件失败，插件公开id不能为空')
    const existing = await this.getByPublicId(pluginInstallDTO.publicId)
    let uninstalled: Plugin | null = null
    if (notNullish(existing)) {
      if (existing.uninstalled === BOOL.TRUE) {
        uninstalled = existing
      } else {
        const msg = `安装插件失败，已存在该插件 name: ${pluginInstallDTO.name} author: ${pluginInstallDTO.author} version: ${pluginInstallDTO.version}`
        LogUtil.error(this.constructor.name, msg)
        throw new Error(msg)
      }
    }

    const pathRelative: string = path.join(pluginInstallDTO.publicId, pluginInstallDTO.version)

    // 创建安装包备份
    const backupService = new BackupService()
    const packagePath = pluginInstallDTO.packagePath
    const backup = await backupService.createBackup(BackupSourceTypeEnum.PLUGIN, 0, packagePath)

    // 安装路径
    const installPath: string = path.join(RootDir(), PLUGIN_RUNTIME, pathRelative)
    await CreateDirIfNotExists(installPath)
    pluginInstallDTO.package.extractAllTo(installPath, true)

    const newPlugin = new Plugin()
    assignExisting(newPlugin, pluginInstallDTO)
    newPlugin.activationType = pluginInstallDTO.activation.type
    newPlugin.entryPath = path.join(PLUGIN_RUNTIME, pathRelative, pluginInstallDTO.entryFile)
    newPlugin.rootPath = pathRelative
    newPlugin.backupId = backup.id as number

    const pluginService = new PluginService()
    let finalPluginId: number
    if (notNullish(uninstalled)) {
      assertNotNullish(uninstalled?.id, '安装插件失败，原插件id不能为空')
      finalPluginId = uninstalled.id
      newPlugin.id = finalPluginId
      newPlugin.pluginData = uninstalled.pluginData
      newPlugin.uninstalled = BOOL.FALSE
      await pluginService.updateById(newPlugin)
    } else {
      finalPluginId = await pluginService.save(newPlugin)
    }

    const pluginManager = getPluginManager()
    await pluginManager.onInstallPlugin(finalPluginId, installType)
    if (newPlugin.activationType === ActivationType.STARTUP) {
      await pluginManager.activatePlugin(finalPluginId, ActivationType.STARTUP)
    }
    LogUtil.info(this.constructor.name, `已安装插件${pluginInstallDTO.author}-${pluginInstallDTO.name}-${pluginInstallDTO.version}`)
    return newPlugin
  }

  /**
   * 从插件包安装插件
   * @param packagePath
   * @param installType
   */
  public async installFromPath(packagePath: string, installType: InstallType): Promise<Plugin> {
    assertNotNullish(packagePath, `插件包路径不能为空`)
    try {
      await fs.promises.access(packagePath, fs.constants.F_OK)
    } catch (error) {
      LogUtil.error(this.constructor.name, `安装插件失败，找不到插件包"${packagePath}"`)
      throw error
    }
    return this.install(this.loadPluginPackage(packagePath), installType)
  }

  /**
   * 重新安装插件
   */
  public async reinstall(pluginId: number, installType: InstallType) {
    const plugin = await this.getById(pluginId)
    assertNotNullish(plugin, `重新安装插件失败，找不到这个插件，pluginId: ${pluginId}`)
    assertNotNullish(plugin.backupId, `重新安装插件失败，插件备份id不可用，pluginId: ${pluginId}`)
    const backupService = new BackupService()
    const backup = await backupService.getById(plugin.backupId as number)
    assertNotNullish(backup, `重新安装插件失败，备份不存在，backupId: ${plugin.backupId}`)
    const workdir = getSettings().store.workdir
    const packagePath = path.join(workdir, backup.filePath as string)
    return this.reinstallFromPath(pluginId, packagePath, installType)
  }

  /**
   * 重新安装插件
   */
  public async reinstallFromPath(pluginId: number, packagePath: string, installType: InstallType) {
    assertNotBlank(packagePath, `重新安装插件失败，给定的安装包路径不可用，pluginId: ${pluginId}，packagePath: ${packagePath}`)
    const plugin = await this.getById(pluginId)
    assertNotNullish(plugin, `卸载插件失败，找不到这个插件，pluginId: ${pluginId}`)
    assertNotNullish(plugin.author, `卸载插件失败，找不到插件所在目录，因为插件的作者为空，pluginId: ${pluginId}`)
    assertNotNullish(plugin.name, `卸载插件失败，找不到插件所在目录，因为插件的名称为空，pluginId: ${pluginId}`)
    assertNotNullish(plugin.version, `卸载插件失败，找不到插件所在目录，因为插件的版本为空，pluginId: ${pluginId}`)
    assertNotNullish(plugin, `重新安装插件失败，找不到这个插件，pluginId: ${pluginId}`)

    // 卸载旧插件
    await this.uninstall(pluginId)

    // 安装
    const installDTO = this.loadPluginPackage(packagePath)
    assertTrue(installDTO.publicId === plugin.publicId, `重新安装插件失败，插件公开id与原插件不符`)
    return this.install(installDTO, installType)
  }

  /**
   * 卸载插件
   */
  public async uninstall(pluginId: number): Promise<number> {
    await getPluginManager().deactivatePlugin(pluginId)
    const plugin = await this.getById(pluginId)
    assertNotNullish(plugin, `卸载插件失败，找不到这个插件，pluginId: ${pluginId}`)
    assertNotNullish(plugin.rootPath, `卸载插件失败，插件根目录路径不存在，pluginId: ${pluginId}`)
    const pluginPath = path.join(RootDir(), PLUGIN_RUNTIME, plugin.rootPath as string)
    try {
      await rm(pluginPath, { recursive: true, force: true })
    } catch (error) {
      if ((error as { code: string }).code !== 'ENOENT') {
        LogUtil.error(this.constructor.name, `卸载插件失败，plugin: ${plugin.publicId},`, error)
        throw error
      }
    }
    return this.setUninstalled(pluginId)
  }

  /**
   * 插件设置为卸载状态
   * @param pluginId 插件id
   */
  public async setUninstalled(pluginId: number): Promise<number> {
    const plugin = new Plugin()
    plugin.id = pluginId
    plugin.uninstalled = BOOL.TRUE
    return transactional('卸载插件', async () => {
      return this.updateById(plugin)
    })
  }

  /**
   * 分页查询
   * @param page
   */
  public async queryPage(page: Page<PluginQueryDTO, Plugin>): Promise<Page<PluginQueryDTO, Plugin>> {
    try {
      if (notNullish(page.query)) {
        page.query.uninstalled = BOOL.FALSE
      } else {
        page.query = { uninstalled: BOOL.FALSE }
      }
      return super.queryPage(page)
    } catch (error) {
      LogUtil.error('LocalTagService', error)
      throw error
    }
  }
}
