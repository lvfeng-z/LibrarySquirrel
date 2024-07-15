import BaseService from './BaseService.ts'
import WorksSet from '../model/WorksSet.ts'
import WorksSetQueryDTO from '../model/queryDTO/WorksSetQueryDTO.ts'
import DB from '../database/DB.ts'
import WorksSetDao from '../dao/WorksSetDao.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { isNullish } from '../util/CommonUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import ReWorksWorksSet from '../model/ReWorksWorksSet.ts'
import ReWorksWorksSetService from './ReWorksWorksSetService.ts'

/**
 * 作品集Service
 */
export default class WorksSetService extends BaseService<WorksSetQueryDTO, WorksSet, WorksSetDao> {
  constructor(db?: DB) {
    super('WorksSetService', new WorksSetDao(db), db)
  }

  /**
   * 关联作品集和作品
   * @param worksDTOs
   * @param worksSet
   */
  link(worksDTOs: WorksDTO[], worksSet: WorksSet) {
    // 校验
    const legalWorksList = worksDTOs.filter((works) => {
      if (isNullish(works)) {
        LogUtil.warn('WorksSetService', `关联作品集和作品时，作品信息意外为空`)
        return false
      }
      if (isNullish(!Object.hasOwn(works, 'id') || works.id)) {
        const siteWorksName = Object.hasOwn(works, 'siteWorksName')
          ? works.siteWorksName
          : 'unknown'
        LogUtil.warn(
          'WorksSetService',
          `关联作品集和作品时，作品id意外为空，siteWorksName: ${siteWorksName}`
        )
        return false
      }
      return true
    })

    if (legalWorksList.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = legalWorksList.map((worksDTO) => {
      const reWorksWorksSet = new ReWorksWorksSet()
      reWorksWorksSet.worksId = worksDTO.id
      reWorksWorksSet.worksSetId = worksSet.id
      return reWorksWorksSet
    })

    // 调用reWorksTagService前区分是否为注入式的DB
    let reWorksTagService: ReWorksWorksSetService
    if (this.injectedDB) {
      reWorksTagService = new ReWorksWorksSetService(this.db)
    } else {
      reWorksTagService = new ReWorksWorksSetService()
    }

    return reWorksTagService.saveBatch(links, true)
  }

  /**
   * 根据作品集在站点的id和入库任务的id查询作品集
   * @param siteWorksSetId 作品集在站点的id
   * @param taskId 入库任务的id
   */
  public async getBySiteWorksSetIdAndTaskId(
    siteWorksSetId: string,
    taskId: number
  ): Promise<WorksSet | undefined> {
    return this.dao.getBySiteWorksSetIdAndTaskId(siteWorksSetId, taskId)
  }
}
