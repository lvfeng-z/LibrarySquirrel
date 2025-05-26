import BaseDao from '../base/BaseDao.js'
import Backup from '../model/entity/Backup.js'
import BackupQueryDTO from '../model/queryDTO/BackupQueryDTO.js'
import DB from '../database/DB.js'

export default class BackupDao extends BaseDao<BackupQueryDTO, Backup> {
  constructor(db: DB, injectedDB: boolean) {
    super('backup', Backup, db, injectedDB)
  }
}
