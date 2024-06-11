import BaseService from './BaseService.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import LocalAuthor from '../model/LocalAuthor.ts'
import BaseDao from '../dao/BaseDao.ts'
import LocalAuthorDao from '../dao/LocalAuthorDao.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import LogUtil from '../util/LogUtil.ts'

/**
 * 本地作者Service
 */
export default class LocalAuthorService extends BaseService<LocalAuthorQueryDTO, LocalAuthor> {
  constructor() {
    super('LocalAuthorService')
  }

  /**
   * 查询SelectItem列表
   */
  public getSelectItems(): Promise<SelectItem> {
    const dao = new LocalAuthorDao()
    try {
      return dao.getSelectItems()
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
    }
  }

  protected getDao(): BaseDao<LocalAuthorQueryDTO, LocalAuthor> {
    return new LocalAuthorDao()
  }
}
