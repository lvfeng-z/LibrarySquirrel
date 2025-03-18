import Page from '../model/util/Page.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/entity/Works.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { WorksDao } from '../dao/WorksDao.ts'
import LogUtil from '../util/LogUtil.ts'
import BaseService from '../base/BaseService.ts'
import SiteAuthorService from './SiteAuthorService.ts'
import SiteService from './SiteService.ts'
import LocalTagService from './LocalTagService.ts'
import DB from '../database/DB.ts'
import SiteTagService from './SiteTagService.ts'
import LocalAuthorService from './LocalAuthorService.ts'
import { AuthorRole } from '../constant/AuthorRole.ts'
import TaskService from './TaskService.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.ts'
import WorksSetService from './WorksSetService.ts'
import WorksSet from '../model/entity/WorksSet.ts'
import PluginWorksResponseDTO from '../model/dto/PluginWorksResponseDTO.ts'
import WorksSaveDTO from '../model/dto/WorksSaveDTO.ts'
import { ReWorksTagService } from './ReWorksTagService.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { SearchCondition } from '../model/util/SearchCondition.js'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.js'
import SiteTag from '../model/entity/SiteTag.js'
import ReWorksAuthorService from './ReWorksAuthorService.js'
import { OriginType } from '../constant/OriginType.js'
import SiteAuthorDTO from '../model/dto/SiteAuthorDTO.js'
import SiteTagDTO from '../model/dto/SiteTagDTO.js'
import ResourceService from './ResourceService.js'
import { OnOff } from '../constant/OnOff.js'

export default class WorksService extends BaseService<WorksQueryDTO, Works, WorksDao> {
  constructor(db?: DB) {
    super(WorksDao, db)
  }

  /**
   * 根据插件返回的作品DTO生成保存作品用的信息
   * @param worksPluginDTO 插件返回的作品DTO
   * @param taskId
   */
  public static async createSaveInfo(worksPluginDTO: PluginWorksResponseDTO, taskId: number): Promise<WorksSaveDTO> {
    // 校验
    AssertNotNullish(worksPluginDTO.works.siteWorksId, '生成作品信息失败，siteWorksId不能为空')
    const worksDTO = new WorksDTO(worksPluginDTO.works as Works)
    const result = new WorksSaveDTO(taskId, worksDTO)
    result.site = worksPluginDTO.site
    result.localAuthors = worksPluginDTO.localAuthors
    result.localTags = worksPluginDTO.localTags
    if (ArrayNotEmpty(worksPluginDTO.siteAuthors)) {
      result.siteAuthors = await SiteAuthorService.createSaveInfos(worksPluginDTO.siteAuthors)
    }
    result.siteTags = worksPluginDTO.siteTags
    result.worksSets = worksPluginDTO.worksSets
    return result
  }

  /**
   * 保存作品信息
   * @param worksDTO
   */
  public async saveWorksInfo(worksDTO: WorksSaveDTO): Promise<number> {
    const worksSets = worksDTO.worksSets
    let siteAuthors = worksDTO.siteAuthors
    let siteTags = worksDTO.siteTags
    const localAuthors = worksDTO.localAuthors
    const localTags = worksDTO.localTags

    // 开启事务
    return this.db
      .transaction(async (transactionDB): Promise<number> => {
        // 如果worksSets不为空，则此作品是作品集中的作品
        const worksSetIds: number[] = []
        if (ArrayNotEmpty(worksSets)) {
          // 遍历处理作品集数组
          // TODO 作品集逻辑有问题
          for (const worksSet of worksSets) {
            const taskService = new TaskService(transactionDB)
            const includeTask = await taskService.getById(worksDTO.taskId)
            AssertNotNullish(includeTask, this.constructor.name, '修改作品集失败，任务id不能为空')
            const rootTaskId = includeTask.pid
            const siteWorksSetId = worksSet.siteWorksSetId

            if (NotNullish(siteWorksSetId) && NotNullish(rootTaskId)) {
              const worksSetService = new WorksSetService(transactionDB)
              const oldWorksSet = await worksSetService.getBySiteWorksSetIdAndTaskId(siteWorksSetId, rootTaskId)
              if (IsNullish(oldWorksSet)) {
                const tempWorksSet = new WorksSet(worksSet)
                worksSetIds.push(await worksSetService.save(tempWorksSet))
              } else if (NotNullish(oldWorksSet?.id)) {
                worksSetIds.push(oldWorksSet.id)
              }
            } else {
              LogUtil.warn(this.constructor.name, `保存作品失败，所属作品集的信息不可用，siteWorksName: ${worksDTO.siteWorksName}`)
            }
          }
        }
        // 保存站点作者
        if (ArrayNotEmpty(siteAuthors)) {
          const siteAuthorService = new SiteAuthorService(transactionDB)
          await siteAuthorService.saveOrUpdateBatchBySiteAuthorId(siteAuthors)
          // 查询站点作者，获取其id，供后面绑定使用
          const siteAuthorIds = siteAuthors.map((siteAuthor) => siteAuthor.siteAuthorId).filter(NotNullish)
          const siteId = siteAuthors[0].siteId as number
          const tempSiteAuthors = await siteAuthorService.listBySiteAuthor(siteAuthorIds, siteId)
          if (ArrayNotEmpty(tempSiteAuthors)) {
            siteAuthors = tempSiteAuthors.map((tempSiteAuthor) => new SiteAuthorDTO(tempSiteAuthor))
          }
        }
        // 保存站点标签
        if (ArrayNotEmpty(siteTags)) {
          const siteTagService = new SiteTagService(transactionDB)
          await siteTagService.saveOrUpdateBatchBySiteTagId(siteTags)
          // 查询站点标签，获取其id，供后面绑定使用
          const siteTagIds = siteTags.map((siteTag) => siteTag.siteTagId).filter(NotNullish)
          const siteId = siteTags[0].siteId as number
          const tempSiteTags = await siteTagService.listBySiteTag(siteTagIds, siteId)
          if (ArrayNotEmpty(tempSiteTags)) {
            siteTags = tempSiteTags.map((tempSiteAuthor) => new SiteTagDTO(tempSiteAuthor))
          }
        }

        // 保存作品
        const works = new Works(worksDTO)
        const worksService = new WorksService(transactionDB)
        worksDTO.id = (await worksService.save(works)) as number

        // 关联作品和作品集
        if (ArrayNotEmpty(worksSets)) {
          const worksSetService = new WorksSetService(transactionDB)
          for (const workSetId of worksSetIds) {
            await worksSetService.link([worksDTO], workSetId)
          }
        }
        if (ArrayNotEmpty(localAuthors) || ArrayNotEmpty(siteAuthors)) {
          const reWorksAuthorService = new ReWorksAuthorService(transactionDB)
          // 关联作品和本地作者
          if (ArrayNotEmpty(localAuthors)) {
            const localAuthorIds = localAuthors
              .map((localAuthor) => {
                if (IsNullish(localAuthor.id)) {
                  return
                }
                return {
                  authorId: localAuthor.id,
                  role: IsNullish(localAuthor.authorRole) ? AuthorRole.MAIN : localAuthor.authorRole
                }
              })
              .filter(NotNullish)
            await reWorksAuthorService.link(OriginType.LOCAL, localAuthorIds, worksDTO.id)
          }
          // 关联作品和站点作者
          if (ArrayNotEmpty(siteAuthors)) {
            const siteAuthorIds = siteAuthors
              .map((siteAuthor) => {
                if (IsNullish(siteAuthor.id)) {
                  return
                }
                return { authorId: siteAuthor.id, role: IsNullish(siteAuthor.authorRole) ? AuthorRole.MAIN : siteAuthor.authorRole }
              })
              .filter(NotNullish)
            await reWorksAuthorService.link(OriginType.SITE, siteAuthorIds, worksDTO.id)
          }
        }
        if (ArrayNotEmpty(localTags) || ArrayNotEmpty(siteTags)) {
          const reWorksTagService = new ReWorksTagService(transactionDB)
          // 关联作品和本地标签
          if (ArrayNotEmpty(localTags)) {
            const localTagIds = localTags.map((localTag) => localTag.id).filter(NotNullish)
            await reWorksTagService.link(OriginType.LOCAL, localTagIds, worksDTO.id)
          }
          // 关联作品和站点标签
          if (ArrayNotEmpty(siteTags)) {
            const siteTagIds = siteTags.map((siteTag) => siteTag.id).filter(NotNullish)
            await reWorksTagService.link(OriginType.SITE, siteTagIds, worksDTO.id)
          }
        }

        return worksDTO.id
      }, `保存作品信息，taskId: ${worksDTO.taskId}`)
      .catch((error) => {
        LogUtil.error(this.constructor.name, '保存作品失败')
        throw error
      })
      .finally(() => {
        if (!this.injectedDB) {
          this.db.release()
        }
      })
      .then()
  }

  /**
   * 根据标签等信息分页查询作品
   * @param page 查询参数
   */
  public async queryPage(page: Page<WorksQueryDTO, WorksDTO>): Promise<Page<WorksQueryDTO, Works>> {
    page = new Page(page)
    try {
      // 查询作品信息
      const resultPage = await this.dao.synthesisQueryPage(page)

      // 给每个作品附加作者信息
      if (NotNullish(resultPage.data)) {
        const worksIds = resultPage.data.map((worksDTO) => worksDTO.id) as number[]
        if (worksIds.length > 0) {
          const localAuthorService = new LocalAuthorService()
          const relationShipMap = await localAuthorService.listReWorksAuthor(worksIds)
          resultPage.data.forEach((worksDTO) => {
            worksDTO.localAuthors = relationShipMap.get(worksDTO.id as number)
          })
        }
      }
      return resultPage
    } catch (error) {
      LogUtil.error(this.constructor.name, error)
      throw error
    }
  }

  /**
   * 多条件分页查询作品
   * @param page
   * @param query
   */
  public async multipleConditionQueryPage(
    page: Page<WorksQueryDTO, WorksDTO>,
    query: SearchCondition[]
  ): Promise<Page<WorksQueryDTO, Works>> {
    page = new Page(page)
    try {
      // 查询作品信息
      const resultPage = await this.dao.multipleConditionQueryPage(page, query)

      // 给每个作品附加作者信息
      if (NotNullish(resultPage.data)) {
        const worksIds = resultPage.data.map((worksDTO) => worksDTO.id) as number[]
        if (worksIds.length > 0) {
          const localAuthorService = new LocalAuthorService()
          const relationShipMap = await localAuthorService.listReWorksAuthor(worksIds)
          resultPage.data.forEach((worksDTO) => {
            worksDTO.localAuthors = relationShipMap.get(worksDTO.id as number)
          })
        }
      }
      return resultPage
    } catch (error) {
      LogUtil.error(this.constructor.name, error)
      throw error
    }
  }

  public async updateWithResById(works: WorksDTO): Promise<number> {
    let db: DB
    if (this.injectedDB) {
      db = this.db as DB
    } else {
      db = new DB(this.constructor.name)
    }
    return db.transaction(async (transactionDB) => {
      const resService = new ResourceService(transactionDB)
      if (NotNullish(works.resource)) {
        await resService.updateById(works.resource)
      }
      return this.updateById(works)
    }, '更新作品信息和资源信息')
  }

  /**
   * 查询作品的完整信息
   * @param worksId 作品id
   */
  public async getFullWorksInfoById(worksId: number): Promise<WorksDTO | undefined> {
    const baseWorksInfo = await super.getById(worksId)
    const worksDTO = new WorksDTO(baseWorksInfo)
    // 资源
    const resService = new ResourceService()
    const resourceList = await resService.listByWorksId(worksId)
    worksDTO.inactiveResource = []
    for (const resource of resourceList) {
      if (resource.state === OnOff.ON) {
        worksDTO.resource = resource
      } else {
        worksDTO.inactiveResource.push(resource)
      }
    }

    // 本地作者
    const localAuthorService = new LocalAuthorService()
    worksDTO.localAuthors = await localAuthorService.listByWorksId(worksId)

    // 本地标签
    const localTagService = new LocalTagService()
    worksDTO.localTags = await localTagService.listByWorksId(worksId)

    // 站点作者
    const siteAuthorService = new SiteAuthorService()
    worksDTO.siteAuthors = await siteAuthorService.listByWorksId(worksId)

    // 站点标签
    const siteTagService = new SiteTagService()
    const siteTagPage = new Page<SiteTagQueryDTO, SiteTag>()
    siteTagPage.pageSize = 100
    const siteTagQuery = new SiteTagQueryDTO()
    siteTagQuery.worksId = worksId
    siteTagQuery.boundOnWorksId = true
    siteTagPage.query = siteTagQuery
    const resultSiteTagPage = await siteTagService.queryPageByWorksId(siteTagPage)
    worksDTO.siteTags = resultSiteTagPage.data

    // 站点信息
    const siteService = new SiteService()
    if (NotNullish(worksDTO.siteId)) {
      worksDTO.site = await siteService.getById(worksDTO.siteId)
    }

    return worksDTO
  }

  /**
   * 根据站点id和作品在站点的id查询作品列表
   * @param siteId 站点id
   * @param siteWorksId 作品在站点的id
   */
  public async listBySiteIdAndSiteWorksId(siteId: number, siteWorksId: string): Promise<Works[]> {
    const query = new WorksQueryDTO()
    query.siteId = siteId
    query.siteWorksId = siteWorksId
    return this.dao.list(query)
  }
}
