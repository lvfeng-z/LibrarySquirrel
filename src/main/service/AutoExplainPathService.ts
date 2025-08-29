import BaseService from '../base/BaseService.ts'
import AutoExplainPathQueryDTO from '../model/queryDTO/AutoExplainPathQueryDTO.ts'
import AutoExplainPath from '../model/entity/AutoExplainPath.ts'
import AutoExplainPathDao from '../dao/AutoExplainPathDao.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import Page from '../model/util/Page.ts'

/**
 * 自动解释路径含义Service
 */
export default class AutoExplainPathService extends BaseService<AutoExplainPathQueryDTO, AutoExplainPath, AutoExplainPathDao> {
  constructor(db?: DatabaseClient) {
    super(AutoExplainPathDao, db)
  }

  /**
   * 分页查询监听path的自动解释
   * @param page
   */
  public async getListenerPage(
    page: Page<AutoExplainPathQueryDTO, AutoExplainPath>
  ): Promise<Page<AutoExplainPathQueryDTO, AutoExplainPath>> {
    return await this.dao.getListenerPage(page)
  }

  /**
   * 获取监听path的自动解释列表
   * @param path
   */
  public async getListenerList(path: string): Promise<AutoExplainPath[]> {
    return await this.dao.getListenerList(path)
  }
}
