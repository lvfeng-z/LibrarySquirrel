import BaseService from './BaseService.ts'
import AutoExplainPathQueryDTO from '../model/queryDTO/AutoExplainPathQueryDTO.ts'
import AutoExplainPath from '../model/AutoExplainPath.ts'
import AutoExplainPathDao from '../dao/AutoExplainPathDao.ts'
import DB from '../database/DB.ts'

/**
 * 自动解释路径含义Service
 */
export default class AutoExplainPathService extends BaseService<
  AutoExplainPathQueryDTO,
  AutoExplainPath,
  AutoExplainPathDao
> {
  constructor(db?: DB) {
    super('AutoExplainPathService', new AutoExplainPathDao(db), db)
  }

  /**
   * 获取监听path的自动解释
   * @param path
   */
  public async getListener(path: string): Promise<AutoExplainPath[]> {
    return await this.dao.getListener(path)
  }
}
