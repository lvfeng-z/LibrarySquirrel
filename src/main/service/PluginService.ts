import Path from 'path'
import PluginDao from '../dao/PluginDao.ts'
import { getRootDir } from '../util/FileSysUtil.ts'
import Plugin from '../model/Plugin.ts'
import BaseService from './BaseService.ts'
import PluginQueryDTO from '../model/queryDTO/PluginQueryDTO.ts'
import DB from '../database/DB.ts'
import { isNullish } from '../util/CommonUtil.ts'
import PluginDTO from '../model/dto/PluginDTO.ts'
import LogUtil from '../util/LogUtil.js'

/**
 * 主键查询
 * @param id
 */
export default class PluginService extends BaseService<PluginQueryDTO, Plugin, PluginDao> {
  constructor(db?: DB) {
    super('PluginService', new PluginDao(db), db)
  }

  /**
   * 根据id获取插件加载路径
   */
  async getDTOById(id: number): Promise<PluginDTO> {
    let resourcePath: string
    const NODE_ENV = process.env.NODE_ENV
    if (NODE_ENV == 'development') {
      resourcePath = '/resources/plugins/task'
    } else {
      resourcePath = '/resources/app.asar.unpacked/resources/plugins/task'
    }

    const plugin = await this.dao.getById(id)
    if (isNullish(plugin)) {
      const msg = `加载插件时出错，id: ${id}不可用`
      LogUtil.error('PluginService', msg)
      throw new Error(msg)
    } else {
      const dto = new PluginDTO(plugin)
      dto.loadPath = Path.join(
        'file://',
        getRootDir(),
        resourcePath,
        plugin.author as string,
        plugin.domain as string,
        plugin.version as string,
        'code',
        plugin.fileName as string
      )
      return dto
    }
  }
}
