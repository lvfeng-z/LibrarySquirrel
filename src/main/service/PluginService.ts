import path from 'path'
import PluginDao from '../dao/PluginDao.ts'
import { CreateDirIfNotExists, RootDir } from '../util/FileSysUtil.ts'
import Plugin from '@shared/model/entity/Plugin.ts'
import BaseService from '../base/BaseService.ts'
import PluginQueryDTO from '@shared/model/queryDTO/PluginQueryDTO.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import { ArrayNotEmpty, NotNullish } from '@shared/util/CommonUtil.ts'
import LogUtil from '../util/LogUtil.js'
import PluginInstallDTO from '@shared/model/dto/PluginInstallDTO.js'
import { AssertNotBlank, AssertNotNullish, AssertTrue } from '@shared/util/AssertUtil.ts'
import fs from 'fs'
import AdmZip from 'adm-zip'
import { PLUGIN_PACKAGE, PLUGIN_RUNTIME } from '../constant/PluginConstant.js'
import lodash from 'lodash'
import { BOOL } from '../constant/BOOL.js'
import Page from '@shared/model/util/Page.js'
import BackupService from './BackupService.js'
import { BackupSourceTypeEnum } from '../constant/BackupSourceTypeEnum.js'
import { rm } from 'node:fs/promises'
import Backup from '@shared/model/entity/Backup.ts'
import { PluginManifest } from '../plugin/types/PluginManifest.ts'
import { AssertArrayNotEmpty } from '@shared/util/AssertUtil.ts'

/**
 * 主键查询
 * @param id
 */
export default class PluginService extends BaseService<PluginQueryDTO, Plugin, PluginDao> {
  constructor(db?: DatabaseClient) {
    super(PluginDao, db)
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
    if (ArrayNotEmpty(plugins)) {
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
    AssertNotNullish(author, '查询插件失败，作者不能为空')
    AssertNotNullish(name, '查询插件失败，插件名称不能为空')
    AssertNotNullish(version, '查询插件失败，插件版本不能为空')
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
    AssertNotNullish(rawEntry, `${msgPrefix}没有获取到必要的安装配置`)
    const jsonContent = rawEntry.getData().toString('utf8')
    const config: PluginManifest = JSON.parse(jsonContent) as PluginManifest

    AssertNotNullish(config.id, `${msgPrefix}插件id不能为空`)
    AssertNotNullish(config.name, `${msgPrefix}插件名称不能为空`)
    AssertNotNullish(config.version, `${msgPrefix}插件版本不能为空`)
    AssertNotNullish(config.author, `${msgPrefix}插件作者不能为空`)
    AssertArrayNotEmpty(config.contributes, `${msgPrefix}插件贡献点不能为空`)
    AssertNotNullish(config.activation?.type, `${msgPrefix}插件启动类型不能为空`)
    AssertNotNullish(config.entryFile, `${msgPrefix}插件入口文件不能为空`)

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
   */
  public async install(pluginInstallDTO: PluginInstallDTO): Promise<Plugin> {
    // 校验是否已安装
    AssertNotNullish(pluginInstallDTO.publicId, '安装插件失败，插件公开id不能为空')
    const existing = await this.getByPublicId(pluginInstallDTO.publicId)
    let uninstalled: Plugin | undefined = undefined
    if (NotNullish(existing)) {
      if (existing.uninstalled === BOOL.TRUE) {
        uninstalled = existing
      } else {
        const msg = `安装插件失败，已存在该插件 name: ${pluginInstallDTO.name} author: ${pluginInstallDTO.author} version: ${pluginInstallDTO.version}`
        LogUtil.error(this.constructor.name, msg)
        throw new Error(msg)
      }
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
    const installPathRelative: string = path.join(PLUGIN_RUNTIME, pluginInstallDTO.publicId, pluginInstallDTO.version)
    const entryPathRelative: string = path.join(installPathRelative, pluginInstallDTO.entryFile)
    const installPath: string = path.join(RootDir(), installPathRelative)
    await CreateDirIfNotExists(installPath)
    pluginInstallDTO.package.extractAllTo(installPath, true)

    return this.transaction(async (transactionDB) => {
      const tempPlugin = new Plugin()
      lodash.assignWith(tempPlugin, pluginInstallDTO)
      tempPlugin.activationType = pluginInstallDTO.activation.type
      tempPlugin.entryPath = entryPathRelative

      const pluginService = new PluginService(transactionDB)
      if (NotNullish(uninstalled)) {
        tempPlugin.pluginData = uninstalled.pluginData
        tempPlugin.uninstalled = BOOL.FALSE
        await pluginService.updateById(tempPlugin)
      } else {
        await pluginService.save(tempPlugin)
      }

      LogUtil.info(this.constructor.name, `已安装插件${pluginInstallDTO.author}-${pluginInstallDTO.name}-${pluginInstallDTO.version}`)
      return tempPlugin
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
  public async installFromPath(packagePath: string): Promise<Plugin> {
    AssertNotNullish(packagePath, `插件包路径不能为空`)
    try {
      await fs.promises.access(packagePath, fs.constants.F_OK)
    } catch (error) {
      LogUtil.error(this.constructor.name, `安装插件失败，找不到插件包"${packagePath}"`)
      throw error
    }
    return this.install(this.loadPluginPackage(packagePath))
  }

  /**
   * 重新安装插件
   */
  public async reinstall(pluginId: number) {
    const plugin = await this.getById(pluginId)
    AssertNotNullish(plugin, `重新安装插件失败，找不到这个插件，pluginId: ${pluginId}`)
    AssertNotBlank(plugin.packagePath, `重新安装插件失败，插件安装包路径不可用，pluginId: ${pluginId}`)
    return this.reinstallFromPath(pluginId, plugin.packagePath)
  }

  /**
   * 重新安装插件
   */
  public async reinstallFromPath(pluginId: number, packagePath: string) {
    AssertNotBlank(packagePath, `重新安装插件失败，给定的安装包路径不可用，pluginId: ${pluginId}，packagePath: ${packagePath}`)
    const plugin = await this.getById(pluginId)
    AssertNotNullish(plugin, `卸载插件失败，找不到这个插件，pluginId: ${pluginId}`)
    AssertNotNullish(plugin.author, `卸载插件失败，找不到插件所在目录，因为插件的作者为空，pluginId: ${pluginId}`)
    AssertNotNullish(plugin.name, `卸载插件失败，找不到插件所在目录，因为插件的名称为空，pluginId: ${pluginId}`)
    AssertNotNullish(plugin.version, `卸载插件失败，找不到插件所在目录，因为插件的版本为空，pluginId: ${pluginId}`)
    AssertNotNullish(plugin, `重新安装插件失败，找不到这个插件，pluginId: ${pluginId}`)
    const pluginPath = path.join(RootDir(), PLUGIN_RUNTIME, plugin.author, plugin.name, plugin.version)
    const backupService = new BackupService(this.db)
    let backup: Backup | undefined
    try {
      backup = await backupService.createBackup(BackupSourceTypeEnum.PLUGIN, pluginId, pluginPath)
    } catch (error) {
      LogUtil.warn(this.constructor.name, '重新安装插件时未能创建备份', error)
    }
    try {
      await this.transaction<Plugin>(async () => {
        await this.uninstall(pluginId)
        const installDTO = this.loadPluginPackage(packagePath)
        if (installDTO.publicId === plugin.publicId) {
          throw new Error('')
        }
        AssertTrue(installDTO.publicId === plugin.publicId, `重新安装插件失败，插件公开id与原插件不符`)
        return await this.install(installDTO)
      }, '重新安装插件')
    } catch (error) {
      if (NotNullish(backup)) {
        await backupService.recoverToPath(backup.id as number, pluginPath, true).catch((recoverError) => {
          LogUtil.error(this.constructor.name, '恢复插件失败', recoverError)
        })
      }
      throw error
    }
  }

  /**
   * 卸载插件
   */
  public async uninstall(pluginId: number): Promise<number> {
    const plugin = await this.getById(pluginId)
    AssertNotNullish(plugin, `卸载插件失败，找不到这个插件，pluginId: ${pluginId}`)
    AssertNotNullish(plugin.author, `卸载插件失败，找不到插件所在目录，因为插件的作者为空，pluginId: ${pluginId}`)
    AssertNotNullish(plugin.name, `卸载插件失败，找不到插件所在目录，因为插件的名称为空，pluginId: ${pluginId}`)
    AssertNotNullish(plugin.version, `卸载插件失败，找不到插件所在目录，因为插件的版本为空，pluginId: ${pluginId}`)
    const pluginPath = path.join(RootDir(), PLUGIN_RUNTIME, plugin.author, plugin.name, plugin.version)
    try {
      await fs.promises.access(pluginPath)
      await rm(pluginPath, { recursive: true, force: true })
    } catch (error) {
      LogUtil.error(this.constructor.name, `卸载插件失败，plugin: ${plugin.author}-${plugin.name}-${plugin.version},`, error)
      if ((error as { code: string }).code !== 'ENOENT') {
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
    return this.transaction<number>(async () => {
      return this.updateById(plugin)
    }, '卸载插件')
  }

  /**
   * 分页查询
   * @param page
   */
  public async queryPage(page: Page<PluginQueryDTO, Plugin>): Promise<Page<PluginQueryDTO, Plugin>> {
    try {
      if (NotNullish(page.query)) {
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
