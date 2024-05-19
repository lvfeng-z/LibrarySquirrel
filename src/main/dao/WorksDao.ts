import BaseDao from './BaseDao.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/Works.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import WorksType from '../constant/WorksType.ts'
import LogUtil from '../util/LogUtil.ts'

export class WorksDao extends BaseDao.AbstractBaseDao<WorksQueryDTO, Works> {
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
    worksType: WorksType
  ): PageModel<WorksQueryDTO, Works> {
    LogUtil.debug('WorksDao', String(include) + String(exclude) + String(worksType))
    return new PageModel<WorksQueryDTO, Works>()
  }
}
