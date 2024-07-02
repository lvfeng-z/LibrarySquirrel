import Path from 'path'
import InstalledPluginsDao from '../dao/InstalledPluginsDao.ts'
import FileSysUtil from '../util/FileSysUtil.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import BaseService from './BaseService.ts'
import InstalledPluginsQueryDTO from '../model/queryDTO/InstalledPluginsQueryDTO.ts'
import DB from '../database/DB.ts'

/**
 * 主键查询
 * @param id
 */
export default class InstalledPluginsService extends BaseService<
  InstalledPluginsQueryDTO,
  InstalledPlugins,
  InstalledPluginsDao
> {
  constructor(db?: DB) {
    super('InstalledPluginsService', new InstalledPluginsDao(db), db)
  }

  /**
   * 根据id获取插件加载路径
   */
  async getClassPathById(id: number): Promise<string> {
    const installedPlugin = await this.dao.getById(id)

    let resourcePath: string
    const NODE_ENV = process.env.NODE_ENV
    if (NODE_ENV == 'development') {
      resourcePath = '/resources/plugins/task'
    } else {
      resourcePath = '/resources/app.asar.unpacked/resources/plugins/task'
    }

    return Path.join(
      'file://',
      FileSysUtil.getRootDir(),
      resourcePath,
      installedPlugin.author as string,
      installedPlugin.domain as string,
      installedPlugin.version as string,
      'code',
      installedPlugin.className as string
    )
  }
}
