import BaseDao from './BaseDao.ts'
import Plugin from '../model/entity/Plugin.ts'
import PluginQueryDTO from '../model/queryDTO/PluginQueryDTO.ts'
import DB from '../database/DB.ts'
import { IsNullish } from '../util/CommonUtil.js'

export default class PluginDao extends BaseDao<PluginQueryDTO, Plugin> {
  constructor(db?: DB) {
    super('plugin', 'PluginDao', db)
  }

  public async checkInstalled(type: string, author: string, name: string, version: string) {
    const statements = `SELECT COUNT(1) as NUM FROM plugin WHERE type = '${type}' AND name = '${name}' AND author = '${author}' AND version = '${version}'`
    const db = this.acquire()
    return db
      .get<unknown[], { NUM: number }>(statements)
      .then((result) => {
        if (IsNullish(result)) {
          return false
        }
        return result.NUM > 0
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
