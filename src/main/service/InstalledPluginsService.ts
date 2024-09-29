import Path from 'path'
import InstalledPluginsDao from '../dao/InstalledPluginsDao.ts'
import { getRootDir } from '../util/FileSysUtil.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import BaseService from './BaseService.ts'
import InstalledPluginsQueryDTO from '../model/queryDTO/InstalledPluginsQueryDTO.ts'
import DB from '../database/DB.ts'
import { isNullish } from '../util/CommonUtil.ts'
import InstalledPluginsDTO from '../model/dto/InstalledPluginsDTO.ts'
import LogUtil from '../util/LogUtil.js'

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
  async getDTOById(id: number): Promise<InstalledPluginsDTO> {
    let resourcePath: string
    const NODE_ENV = process.env.NODE_ENV
    if (NODE_ENV == 'development') {
      resourcePath = '/resources/plugins/task'
    } else {
      resourcePath = '/resources/app.asar.unpacked/resources/plugins/task'
    }

    const installedPlugin = await this.dao.getById(id)
    if (isNullish(installedPlugin)) {
      const msg = `加载插件时出错，id: ${id}不可用`
      LogUtil.error('InstalledPluginsService', msg)
      throw new Error(msg)
    } else {
      const dto = new InstalledPluginsDTO(installedPlugin)
      dto.loadPath = Path.join(
        'file://',
        getRootDir(),
        resourcePath,
        installedPlugin.author as string,
        installedPlugin.domain as string,
        installedPlugin.version as string,
        'code',
        installedPlugin.fileName as string
      )
      return dto
    }
  }
}
