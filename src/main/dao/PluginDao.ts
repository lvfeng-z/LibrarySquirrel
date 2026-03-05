import BaseDao from '../base/BaseDao.ts'
import Plugin from '@shared/model/entity/Plugin.ts'
import PluginQueryDTO from '@shared/model/queryDTO/PluginQueryDTO.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

export default class PluginDao extends BaseDao<PluginQueryDTO, Plugin> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('plugin', Plugin, db, injectedDB)
  }

  public async checkInstalled(publicId: string) {
    const statements = `SELECT COUNT(1) as NUM FROM plugin WHERE public_id = '${publicId}'`
    const db = this.acquire()
    return db
      .get<unknown[], { NUM: number }>(statements)
      .then((result) => {
        if (isNullish(result)) {
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
