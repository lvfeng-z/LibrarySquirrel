import Path from 'path'
import InstalledPluginsDao from '../dao/InstalledPluginsDao.ts'
import { getRootDir } from '../util/FileSysUtil.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import BaseService from './BaseService.ts'
import InstalledPluginsQueryDTO from '../model/queryDTO/InstalledPluginsQueryDTO.ts'
import DB from '../database/DB.ts'
import { isNullish } from '../util/CommonUtil.ts'

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
  async getClassPathById(id: number): Promise<string | undefined> {
    let resourcePath: string
    const NODE_ENV = process.env.NODE_ENV
    if (NODE_ENV == 'development') {
      resourcePath = '/resources/plugins/task'
    } else {
      resourcePath = '/resources/app.asar.unpacked/resources/plugins/task'
    }

    const installedPlugin = await this.dao.getById(id)
    if (isNullish(installedPlugin)) {
      return undefined
    } else {
      return Path.join(
        'file://',
        getRootDir(),
        resourcePath,
        installedPlugin.author as string,
        installedPlugin.domain as string,
        installedPlugin.version as string,
        'code',
        installedPlugin.fileName as string
      )
    }
  }
}
