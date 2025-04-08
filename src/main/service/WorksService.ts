import Page from '../model/util/Page.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/entity/Works.ts'
import WorksFullDTO from '../model/dto/WorksFullDTO.js'
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
import { ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.ts'
import WorksSetService from './WorksSetService.ts'
import WorksSet from '../model/entity/WorksSet.ts'
import PluginWorksResponseDTO from '../model/dto/PluginWorksResponseDTO.ts'
import WorksSaveDTO from '../model/dto/WorksSaveDTO.ts'
import { ReWorksTagService } from './ReWorksTagService.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { SearchCondition } from '../model/util/SearchCondition.js'
import ReWorksAuthorService from './ReWorksAuthorService.js'
import { OriginType } from '../constant/OriginType.js'
import SiteAuthorRoleDTO from '../model/dto/SiteAuthorRoleDTO.js'
import SiteTagFullDTO from '../model/dto/SiteTagFullDTO.js'
import ResourceService from './ResourceService.js'
import { BOOL } from '../constant/BOOL.js'
import ReWorksWorksSetService from './ReWorksWorksSetService.js'

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
    const worksFullDTO = new WorksFullDTO(worksPluginDTO.works as Works)
    const result = new WorksSaveDTO(taskId, worksFullDTO)
    result.site = worksPluginDTO.site
    result.localAuthors = worksPluginDTO.localAuthors
    result.localTags = worksPluginDTO.localTags
    if (ArrayNotEmpty(worksPluginDTO.siteAuthors)) {
      result.siteAuthors = await SiteAuthorService.createSaveInfos(worksPluginDTO.siteAuthors)
    }
    if (ArrayNotEmpty(worksPluginDTO.siteTags)) {
      result.siteTags = await SiteTagService.createSaveInfos(worksPluginDTO.siteTags)
    }
    result.worksSets = worksPluginDTO.worksSets
    return result
  }

  /**
   * 保存作品信息并关联作品集、作者、标签
   * @param worksDTO
   * @param update
   */
  public async saveOrUpdateWorksInfos(worksDTO: WorksSaveDTO, update: boolean): Promise<number> {
    await this.saveSurroundingData(worksDTO.worksSets, worksDTO.siteAuthors, worksDTO.siteTags)

    if (ArrayNotEmpty(worksDTO.worksSets)) {
      const worksSetService = new WorksSetService()
      const tempParam = worksDTO.worksSets
        .map((worksSet) => {
          if (IsNullish(worksSet.siteWorksSetId) || IsNullish(worksSet.siteId)) {
            return
          }
          return {
            siteWorksSetId: worksSet.siteWorksSetId,
            siteId: worksSet.siteId
          }
        })
        .filter(NotNullish)
      worksDTO.worksSets = await worksSetService.listBySiteWorksSet(tempParam)
    }
    if (ArrayNotEmpty(worksDTO.siteAuthors)) {
      const siteAuthorService = new SiteAuthorService()
      const tempParam = worksDTO.siteAuthors
        .map((siteAuthor) => {
          if (IsNullish(siteAuthor.siteAuthorId) || IsNullish(siteAuthor.siteId)) {
            return
          }
          return {
            siteAuthorId: siteAuthor.siteAuthorId,
            siteId: siteAuthor.siteId
          }
        })
        .filter(NotNullish)
      worksDTO.siteAuthors = (await siteAuthorService.listBySiteAuthor(tempParam)).map(
        (siteAuthor) => new SiteAuthorRoleDTO(siteAuthor)
      )
    }
    if (ArrayNotEmpty(worksDTO.siteTags)) {
      const siteTagService = new SiteTagService()
      const tempParam = worksDTO.siteTags
        .map((siteTag) => {
          if (IsNullish(siteTag.siteTagId) || IsNullish(siteTag.siteId)) {
            return
          }
          return {
            siteTagId: siteTag.siteTagId,
            siteId: siteTag.siteId
          }
        })
        .filter(NotNullish)
      worksDTO.siteTags = (await siteTagService.listBySiteTag(tempParam)).map((siteTag) => new SiteTagFullDTO(siteTag))
    }
    return this.saveOrUpdateAndLink(worksDTO, update)
  }

  /**
   * 保存作品信息并关联作品集、作者、标签
   * @param worksDTO
   * @param update
   */
  public async saveOrUpdateAndLink(worksDTO: WorksSaveDTO, update: boolean): Promise<number> {
    const worksSets = worksDTO.worksSets
    const siteAuthors = worksDTO.siteAuthors
    const siteTags = worksDTO.siteTags
    const localAuthors = worksDTO.localAuthors
    const localTags = worksDTO.localTags

    // 开启事务
    return this.db
      .transaction(async (transactionDB): Promise<number> => {
        // 保存作品
        if (update) {
          const worksService = new WorksService(transactionDB)
          await worksService.updateById(worksDTO)
        } else {
          const worksService = new WorksService(transactionDB)
          worksDTO.id = await worksService.save(worksDTO)
        }
        AssertNotNullish(worksDTO.id, '保存作品的周边信息失败，作品id不能为空')

        // 关联作品和作品集
        if (ArrayNotEmpty(worksSets)) {
          const reWorksWorksSetService = new ReWorksWorksSetService(transactionDB)
          const worksSetIds = worksSets.map((worksSet) => worksSet.id).filter(NotNullish)
          await reWorksWorksSetService.updateLinks(worksDTO.id, worksSetIds)
        }
        // 作者
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
                  authorId: String(localAuthor.id),
                  role: IsNullish(localAuthor.authorRole) ? AuthorRole.MAIN : localAuthor.authorRole
                }
              })
              .filter(NotNullish)
            await reWorksAuthorService.updateLinks(OriginType.LOCAL, localAuthorIds, worksDTO.id)
          }
          // 关联作品和站点作者
          if (ArrayNotEmpty(siteAuthors)) {
            const siteAuthorIds = siteAuthors
              .map((siteAuthor) => {
                if (IsNullish(siteAuthor.id)) {
                  return
                }
                return {
                  authorId: String(siteAuthor.id),
                  role: IsNullish(siteAuthor.authorRole) ? AuthorRole.MAIN : siteAuthor.authorRole
                }
              })
              .filter(NotNullish)
            await reWorksAuthorService.updateLinks(OriginType.SITE, siteAuthorIds, worksDTO.id)
          }
        }
        // 标签
        if (ArrayNotEmpty(localTags) || ArrayNotEmpty(siteTags)) {
          const reWorksTagService = new ReWorksTagService(transactionDB)
          // 关联作品和本地标签
          if (ArrayNotEmpty(localTags)) {
            const localTagIds = localTags.map((localTag) => localTag.id).filter(NotNullish)
            await reWorksTagService.updateLinks(OriginType.LOCAL, localTagIds, worksDTO.id)
          }
          // 关联作品和站点标签
          if (ArrayNotEmpty(siteTags)) {
            const siteTagIds = siteTags.map((siteTag) => siteTag.id).filter(NotNullish)
            await reWorksTagService.updateLinks(OriginType.SITE, siteTagIds, worksDTO.id)
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
   * 保存作者、标签、作品集
   * @param worksSets
   * @param siteAuthors
   * @param siteTags
   */
  public async saveSurroundingData(
    worksSets: WorksSet[] | undefined | null,
    siteAuthors: SiteAuthorRoleDTO[] | undefined | null,
    siteTags: SiteTagFullDTO[] | undefined | null
  ): Promise<void> {
    // 保存作品集
    if (ArrayNotEmpty(worksSets)) {
      const worksSetService = new WorksSetService()
      await worksSetService.saveOrUpdateBatchBySiteWorksSetId(worksSets)
    }
    // 保存站点作者
    if (ArrayNotEmpty(siteAuthors)) {
      const siteAuthorService = new SiteAuthorService()
      await siteAuthorService.saveOrUpdateBatchBySiteAuthorId(siteAuthors)
    }
    // 保存站点标签
    if (ArrayNotEmpty(siteTags)) {
      const siteTagService = new SiteTagService()
      await siteTagService.saveOrUpdateBatchBySiteTagId(siteTags)
    }
  }

  /**
   * 根据标签等信息分页查询作品
   * @param page 查询参数
   */
  public async synthesisQueryPage(page: Page<WorksQueryDTO, WorksFullDTO>): Promise<Page<WorksQueryDTO, Works>> {
    return this.dao.synthesisQueryPage(page)
  }

  /**
   * 多条件分页查询作品
   * @param page
   * @param query
   */
  public async multipleConditionQueryPage(
    page: Page<WorksQueryDTO, WorksFullDTO>,
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

  public async updateWithResById(worksFullDTO: WorksFullDTO): Promise<number> {
    return this.db.transaction(async (transactionDB) => {
      const resService = new ResourceService(transactionDB)
      if (NotNullish(worksFullDTO.resource)) {
        await resService.updateById(worksFullDTO.resource)
      }
      return this.updateById(worksFullDTO)
    }, '更新作品信息和资源信息')
  }

  /**
   * 查询作品的完整信息
   * @param worksId 作品id
   */
  public async getFullWorksInfoById(worksId: number): Promise<WorksFullDTO | undefined> {
    const baseWorksInfo = await super.getById(worksId)
    const fullInfo = new WorksFullDTO(baseWorksInfo)
    // 资源
    const resService = new ResourceService()
    const resourceList = await resService.listByWorksId(worksId)
    fullInfo.inactiveResource = []
    for (const resource of resourceList) {
      if (resource.state === BOOL.TRUE) {
        fullInfo.resource = resource
      } else {
        fullInfo.inactiveResource.push(resource)
      }
    }

    // 本地作者
    const localAuthorService = new LocalAuthorService()
    fullInfo.localAuthors = await localAuthorService.listDTOByWorksId(worksId)

    // 本地标签
    const localTagService = new LocalTagService()
    fullInfo.localTags = await localTagService.listByWorksId(worksId)

    // 站点作者
    const siteAuthorService = new SiteAuthorService()
    fullInfo.siteAuthors = await siteAuthorService.listByWorksId(worksId)

    // 站点标签
    const siteTagService = new SiteTagService()
    fullInfo.siteTags = await siteTagService.listDTOByWorksId(worksId)

    // 站点信息
    const siteService = new SiteService()
    if (NotNullish(fullInfo.siteId)) {
      fullInfo.site = await siteService.getById(fullInfo.siteId)
    }

    return fullInfo
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
