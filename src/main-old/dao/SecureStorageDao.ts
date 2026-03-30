import BaseDao from '../base/BaseDao.ts'
import SecureStorage from '@shared/model/entity/SecureStorage.ts'
import SecureStorageQueryDTO from '@shared/model/queryDTO/SecureStorageQueryDTO.ts'

export default class SecureStorageDao extends BaseDao<SecureStorageQueryDTO, SecureStorage> {
  constructor() {
    super('secure_storage', SecureStorage)
  }
}
