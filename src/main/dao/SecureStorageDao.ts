import BaseDao from '../base/BaseDao.js'
import SecureStorage from '@shared/model/entity/SecureStorage.js'
import SecureStorageQueryDTO from '@shared/model/queryDTO/SecureStorageQueryDTO.js'
import DatabaseClient from '../database/DatabaseClient.js'

export default class SecureStorageDao extends BaseDao<SecureStorageQueryDTO, SecureStorage> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('secure_storage', SecureStorage, db, injectedDB)
  }
}
