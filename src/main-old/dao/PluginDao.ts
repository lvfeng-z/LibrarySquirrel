import BaseDao from '../base/BaseDao.ts'
import Plugin from '@shared/model/entity/Plugin.ts'
import PluginQueryDTO from '@shared/model/queryDTO/PluginQueryDTO.ts'
import { Database } from '../database/Database.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

export default class PluginDao extends BaseDao<PluginQueryDTO, Plugin> {
  constructor() {
    super('plugin', Plugin)
  }

  public async checkInstalled(publicId: string) {
    const statements = `SELECT COUNT(1) as NUM FROM plugin WHERE public_id = '${publicId}'`
    const result = await Database.get<unknown[], { NUM: number }>(statements)
    if (isNullish(result)) {
      return false
    }
    return result.NUM > 0
  }
}
