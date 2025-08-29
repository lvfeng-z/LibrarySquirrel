import BaseDao from '../base/BaseDao.js'
import Backup from '../model/entity/Backup.js'
import BackupQueryDTO from '../model/queryDTO/BackupQueryDTO.js'
import DatabaseClient from '../database/DatabaseClient.js'

export default class BackupDao extends BaseDao<BackupQueryDTO, Backup> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('backup', Backup, db, injectedDB)
  }
}
