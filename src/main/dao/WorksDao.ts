import BaseDao from './BaseDao.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/Works.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import LogUtil from '../util/LogUtil.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'

export class WorksDao extends BaseDao.AbstractBaseDao<WorksQueryDTO, Works> {
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  /**
   * 根据标签分页查询作品
   * @param page 查询参数
   */
  public queryPageByTag(page: PageModel<WorksQueryDTO, WorksDTO>): PageModel<WorksQueryDTO, Works> {
    LogUtil.debug('WorksDao', String(page))
    return new PageModel<WorksQueryDTO, Works>()
  }
}
