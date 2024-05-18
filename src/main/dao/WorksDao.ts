import { AbstractBaseDao } from './BaseDao'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO'
import Works from '../model/Works'
import { PageModel } from '../model/utilModels/PageModel'
import { WORKS_TYPE } from '../constant/WorksConstant'
import LogUtil from '../util/LogUtil'

export class WorksDao extends AbstractBaseDao<WorksQueryDTO, Works> {
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  /**
   * 根据标签分页查询作品
   * @param include 包含的标签Id列表
   * @param exclude 排除的标签Id列表
   * @param worksType 作品类型
   */
  public queryPageByTag(
    include: number[],
    exclude: number[],
    worksType: WORKS_TYPE
  ): PageModel<WorksQueryDTO, Works> {
    LogUtil.debug('WorksDao', String(include) + String(exclude) + String(worksType))
    return new PageModel<WorksQueryDTO, Works>()
  }
}
