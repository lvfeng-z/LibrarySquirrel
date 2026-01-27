import Page from '../model/util/Page.ts'
import WorkQueryDTO from '../model/queryDTO/WorkQueryDTO.ts'
import Work from '../model/entity/Work.ts'
import WorkFullDTO from '../model/dto/WorkFullDTO.ts'
import { WorkDao } from '../dao/WorkDao.ts'
import LogUtil from '../util/LogUtil.ts'
import BaseService from '../base/BaseService.ts'
import SiteAuthorService from './SiteAuthorService.ts'
import SiteService from './SiteService.ts'
import LocalTagService from './LocalTagService.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import SiteTagService from './SiteTagService.ts'
import LocalAuthorService from './LocalAuthorService.ts'
import { AuthorRank } from '../constant/AuthorRank.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.ts'
import WorkSetService from './WorkSetService.ts'
import WorkSet from '../model/entity/WorkSet.ts'
import PluginWorkResponseDTO from '../model/dto/PluginWorkResponseDTO.ts'
import WorkSaveDTO from '../model/dto/WorkSaveDTO.ts'
import { ReWorkTagService } from './ReWorkTagService.ts'
import { AssertArrayNotEmpty, AssertNotNullish } from '../util/AssertUtil.js'
import { SearchCondition } from '../model/util/SearchCondition.js'
import ReWorkAuthorService from './ReWorkAuthorService.ts'
import { OriginType } from '../constant/OriginType.js'
import RankedSiteAuthor from '../model/domain/RankedSiteAuthor.ts'
import SiteTagFullDTO from '../model/dto/SiteTagFullDTO.js'
import ResourceService from './ResourceService.js'
import { BOOL } from '../constant/BOOL.js'
import ReWorkWorkSetService from './ReWorkWorkSetService.ts'
import { GVar, GVarEnum } from '../base/GVar.js'
import path from 'path'
import StringUtil from '../util/StringUtil.js'
import fs from 'fs/promises'
import WorkWithWorkSetId from '../model/domain/WorkWithWorkSetId.ts'
import lodash from 'lodash'

export default class WorkService extends BaseService<WorkQueryDTO, Work, WorkDao> {
  constructor(db?: DatabaseClient) {
    super(WorkDao, db)
  }

  /**
   * 根据插件返回的作品DTO生成保存作品用的信息
   * @param pluginWorkResponseDTO 插件返回的作品DTO
   * @param taskId
   */
  public static async createSaveInfoFromPlugin(pluginWorkResponseDTO: PluginWorkResponseDTO, taskId: number): Promise<WorkSaveDTO> {
    // 校验
    AssertNotNullish(pluginWorkResponseDTO.work.siteWorkId, '生成作品信息失败，siteWorkId不能为空')
    const workFullDTO = new WorkFullDTO(pluginWorkResponseDTO.work as Work)
    const result = new WorkSaveDTO(taskId, workFullDTO)
    result.site = pluginWorkResponseDTO.site
    result.localAuthors = pluginWorkResponseDTO.localAuthors
    result.localTags = pluginWorkResponseDTO.localTags
    // 生成站点作者保存信息
    if (ArrayNotEmpty(pluginWorkResponseDTO.siteAuthors)) {
      result.siteAuthors = await SiteAuthorService.createSaveInfosFromPlugin(pluginWorkResponseDTO.siteAuthors)
    }
    // 生成站点标签保存信息
    if (ArrayNotEmpty(pluginWorkResponseDTO.siteTags)) {
      result.siteTags = await SiteTagService.createSaveInfosFromPlugin(pluginWorkResponseDTO.siteTags)
    }
    // 生成作品集保存信息
    if (ArrayNotEmpty(pluginWorkResponseDTO.workSets)) {
      result.workSets = await WorkSetService.createSaveInfosFromPlugin(pluginWorkResponseDTO.workSets)
    }
    return result
  }

  /**
   * 保存作品信息并关联作品集、作者、标签
   * @param workDTO
   * @param update
   */
  public async saveOrUpdateWorkInfos(workDTO: WorkSaveDTO, update: boolean): Promise<number> {
    await this.saveSurroundingData(workDTO.workSets, workDTO.siteAuthors, workDTO.siteTags)

    if (ArrayNotEmpty(workDTO.workSets)) {
      const workSetService = new WorkSetService()
      const tempParam = workDTO.workSets
        .map((workSet) => {
          if (IsNullish(workSet.siteWorkSetId) || IsNullish(workSet.siteId)) {
            return
          }
          return {
            siteWorkSetId: workSet.siteWorkSetId,
            siteId: workSet.siteId
          }
        })
        .filter(NotNullish)
      workDTO.workSets = await workSetService.listBySiteWorkSet(tempParam)
    }
    if (ArrayNotEmpty(workDTO.siteAuthors)) {
      const siteAuthorService = new SiteAuthorService()
      const tempParam = workDTO.siteAuthors
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
      workDTO.siteAuthors = (await siteAuthorService.listBySiteAuthor(tempParam)).map(
        (siteAuthor) => new RankedSiteAuthor(siteAuthor)
      )
    }
    if (ArrayNotEmpty(workDTO.siteTags)) {
      const siteTagService = new SiteTagService()
      const tempParam = workDTO.siteTags
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
      workDTO.siteTags = (await siteTagService.listBySiteTag(tempParam)).map((siteTag) => new SiteTagFullDTO(siteTag))
    }
    return this.saveOrUpdateAndLink(workDTO, update)
  }

  /**
   * 保存作品信息并关联作品集、作者、标签
   * @param workSaveDTO
   * @param update
   */
  public async saveOrUpdateAndLink(workSaveDTO: WorkSaveDTO, update: boolean): Promise<number> {
    const workSets = workSaveDTO.workSets
    const siteAuthors = workSaveDTO.siteAuthors
    const siteTags = workSaveDTO.siteTags
    const localAuthors = workSaveDTO.localAuthors
    const localTags = workSaveDTO.localTags

    // 开启事务
    return this.transaction<number>(async (transactionDB): Promise<number> => {
      // 保存作品
      if (update) {
        const workService = new WorkService(transactionDB)
        await workService.updateById(workSaveDTO)
      } else {
        const workService = new WorkService(transactionDB)
        workSaveDTO.id = await workService.save(workSaveDTO)
      }
      AssertNotNullish(workSaveDTO.id, '保存作品的周边信息失败，作品id不能为空')

      // 关联作品和作品集
      if (ArrayNotEmpty(workSets)) {
        const reWorkWorkSetService = new ReWorkWorkSetService(transactionDB)
        const workSetIds = workSets.map((workSet) => workSet.id).filter(NotNullish)
        await reWorkWorkSetService.updateLinks(workSaveDTO.id, workSetIds)
      }
      // 作者
      if (ArrayNotEmpty(localAuthors) || ArrayNotEmpty(siteAuthors)) {
        const reWorkAuthorService = new ReWorkAuthorService(transactionDB)
        // 关联作品和本地作者
        if (ArrayNotEmpty(localAuthors)) {
          const localAuthorIds = localAuthors
            .map((localAuthor) => {
              if (IsNullish(localAuthor.id)) {
                return
              }
              return {
                authorId: String(localAuthor.id),
                rank: IsNullish(localAuthor.authorRank) ? AuthorRank.RANK_0 : localAuthor.authorRank
              }
            })
            .filter(NotNullish)
          await reWorkAuthorService.updateLinks(OriginType.LOCAL, localAuthorIds, workSaveDTO.id)
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
                rank: IsNullish(siteAuthor.authorRank) ? AuthorRank.RANK_0 : siteAuthor.authorRank
              }
            })
            .filter(NotNullish)
          await reWorkAuthorService.updateLinks(OriginType.SITE, siteAuthorIds, workSaveDTO.id)
        }
      }
      // 标签
      if (ArrayNotEmpty(localTags) || ArrayNotEmpty(siteTags)) {
        const reWorkTagService = new ReWorkTagService(transactionDB)
        // 关联作品和本地标签
        if (ArrayNotEmpty(localTags)) {
          const localTagIds = localTags.map((localTag) => localTag.id).filter(NotNullish)
          await reWorkTagService.updateLinks(OriginType.LOCAL, localTagIds, workSaveDTO.id)
        }
        // 关联作品和站点标签
        if (ArrayNotEmpty(siteTags)) {
          const siteTagIds = siteTags.map((siteTag) => siteTag.id).filter(NotNullish)
          await reWorkTagService.updateLinks(OriginType.SITE, siteTagIds, workSaveDTO.id)
        }
      }

      return workSaveDTO.id
    }, `保存作品信息，taskId: ${workSaveDTO.taskId}`)
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
   * @param workSets
   * @param siteAuthors
   * @param siteTags
   */
  public async saveSurroundingData(
    workSets: WorkSet[] | undefined | null,
    siteAuthors: RankedSiteAuthor[] | undefined | null,
    siteTags: SiteTagFullDTO[] | undefined | null
  ): Promise<void> {
    // 保存作品集
    if (ArrayNotEmpty(workSets)) {
      const workSetService = new WorkSetService()
      await workSetService.saveOrUpdateBatchBySiteWorkSetId(workSets)
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
  public async synthesisQueryPage(page: Page<WorkQueryDTO, WorkFullDTO>): Promise<Page<WorkQueryDTO, Work>> {
    return this.dao.synthesisQueryPage(page)
  }

  /**
   * 多条件分页查询作品
   * @param page
   * @param query
   */
  public async multipleConditionQueryPage(
    page: Page<WorkQueryDTO, WorkFullDTO>,
    query: SearchCondition[]
  ): Promise<Page<WorkQueryDTO, Work>> {
    page = new Page(page)
    try {
      // 查询作品信息
      const resultPage = await this.dao.multipleConditionQueryPage(page, query)

      // 给每个作品附加作者信息
      if (NotNullish(resultPage.data)) {
        const workIds = resultPage.data.map((workDTO) => workDTO.id) as number[]
        if (workIds.length > 0) {
          const localAuthorService = new LocalAuthorService()
          const relationShipMap = await localAuthorService.listReWorkAuthor(workIds)
          resultPage.data.forEach((workDTO) => {
            workDTO.localAuthors = relationShipMap.get(workDTO.id as number)
          })
        }
      }
      return resultPage
    } catch (error) {
      LogUtil.error(this.constructor.name, error)
      throw error
    }
  }

  public async updateWithResById(workFullDTO: WorkFullDTO): Promise<number> {
    return this.transaction<number>(async (transactionDB) => {
      const resService = new ResourceService(transactionDB)
      if (NotNullish(workFullDTO.resource)) {
        await resService.updateById(workFullDTO.resource)
      }
      return this.updateById(workFullDTO)
    }, '更新作品信息和资源信息')
  }

  /**
   * 根据作品id删除作品及其相关数据
   * @param workId
   */
  public async deleteWorkAndSurroundingData(workId: number): Promise<boolean> {
    return this.transaction<boolean>(async (transactionDB) => {
      const resService = new ResourceService(transactionDB)
      const resList = await resService.listByWorkId(workId)
      await this.deleteById(workId)
      if (ArrayNotEmpty(resList)) {
        const workdir = GVar.get(GVarEnum.SETTINGS).store.workdir
        const resFiles = resList
          .map((res) => {
            if (StringUtil.isNotBlank(res.filePath)) {
              return path.join(workdir, res.filePath)
            } else {
              return undefined
            }
          })
          .filter(NotNullish)
        const resDeletePromiseList: Promise<void>[] = []
        for (const resFile of resFiles) {
          resDeletePromiseList.push(fs.unlink(resFile))
        }
        await Promise.all(resDeletePromiseList)
      }
      return true
    }, `删除作品${workId}及其相关数据`)
  }

  /**
   * 查询作品的完整信息
   * @param workId 作品id
   */
  public async getFullWorkInfoById(workId: number): Promise<WorkFullDTO | undefined> {
    const baseWorkInfo = await this.getById(workId)
    const fullInfo = new WorkFullDTO(baseWorkInfo)
    // 资源
    const resService = new ResourceService()
    const resourceList = await resService.listByWorkId(workId)
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
    fullInfo.localAuthors = await localAuthorService.listDTOByWorkId(workId)

    // 本地标签
    const localTagService = new LocalTagService()
    fullInfo.localTags = await localTagService.listByWorkId(workId)

    // 站点作者
    const siteAuthorService = new SiteAuthorService()
    fullInfo.siteAuthors = await siteAuthorService.listByWorkId(workId)

    // 站点标签
    const siteTagService = new SiteTagService()
    fullInfo.siteTags = await siteTagService.listDTOByWorkId(workId)

    // 站点信息
    const siteService = new SiteService()
    if (NotNullish(fullInfo.siteId)) {
      fullInfo.site = await siteService.getById(fullInfo.siteId)
    }

    return fullInfo
  }

  /**
   * 查询作品的完整信息列表
   * @param workIds 作品id列表
   */
  public async listFullWorkInfoByIds(workIds: number[]): Promise<WorkFullDTO[]> {
    const baseWorkInfos = await this.listByIds(workIds)
    const fullInfos = baseWorkInfos.map((baseWorkInfo) => new WorkFullDTO(baseWorkInfo))
    // 资源
    const resService = new ResourceService()
    const resourceList = await resService.listByWorkIds(workIds)
    const workIdToResourceMap = lodash.groupBy(resourceList, 'workId')

    // 本地作者
    const localAuthorService = new LocalAuthorService()
    const localAuthors = await localAuthorService.listRankedLocalAuthorWithWorkIdByWorkIds(workIds)
    const workIdToLocalAuthorMap = lodash.groupBy(localAuthors, 'workId')

    // 本地标签
    const localTagService = new LocalTagService()
    const localTags = await localTagService.listLocalTagWithWorkIdByWorkIds(workIds)
    const workIdToLocalTagMap = lodash.groupBy(localTags, 'workId')

    // 站点作者
    const siteAuthorService = new SiteAuthorService()
    const siteAuthors = await siteAuthorService.listRankedSiteAuthorWithWorkIdByWorkIds(workIds)
    const workIdToSiteAuthorMap = lodash.groupBy(siteAuthors, 'workId')

    // 站点标签
    const siteTagService = new SiteTagService()
    const siteTags = await siteTagService.listSiteTagWithWorkIdByWorkIds(workIds)
    const workIdToSiteTagMap = lodash.groupBy(siteTags, 'workId')

    // 站点信息
    const siteService = new SiteService()
    const siteIds = fullInfos.map((fullInfo) => fullInfo.siteId).filter(NotNullish)
    const sites = ArrayNotEmpty(siteIds) ? await siteService.listByIds(siteIds) : []
    const siteIdToSiteMap = lodash.keyBy(sites, 'id')

    // 作品集
    const workSetService = new WorkSetService()
    const workIdToWorkSetMap = await workSetService.getWorkToWorkSetMapByWorkIds(workIds)

    for (const fullInfo of fullInfos) {
      fullInfo.inactiveResource = []
      const tempWorkId = fullInfo.id
      if (NotNullish(tempWorkId)) {
        const tempResourceList = workIdToResourceMap[tempWorkId]
        for (const resource of tempResourceList) {
          if (resource.state === BOOL.TRUE) {
            fullInfo.resource = resource
          } else {
            fullInfo.inactiveResource.push(resource)
          }
        }
        fullInfo.localAuthors = workIdToLocalAuthorMap[tempWorkId]
        fullInfo.localTags = workIdToLocalTagMap[tempWorkId]
        fullInfo.siteAuthors = workIdToSiteAuthorMap[tempWorkId]
        fullInfo.siteTags = workIdToSiteTagMap[tempWorkId]
        fullInfo.workSets = workIdToWorkSetMap[tempWorkId]
      }
      const tempSiteId = fullInfo.siteId
      fullInfo.site = IsNullish(tempSiteId) ? undefined : siteIdToSiteMap[tempSiteId]
    }

    return fullInfos
  }

  /**
   * 根据站点id和作品在站点的id查询作品列表
   * @param siteId 站点id
   * @param siteWorkId 作品在站点的id
   */
  public async listBySiteIdAndSiteWorkId(siteId: number, siteWorkId: string): Promise<Work[]> {
    const query = new WorkQueryDTO()
    query.siteId = siteId
    query.siteWorkId = siteWorkId
    return this.dao.list(query)
  }

  /**
   * 根据站点id和作品在站点的id查询作品列表
   * @param siteIdAndSiteWorkIds
   */
  public async listBySiteIdAndSiteWorkIds(siteIdAndSiteWorkIds: { siteId: number; siteWorkId: string }[]): Promise<Work[]> {
    AssertArrayNotEmpty(siteIdAndSiteWorkIds, this.constructor.name, '根据站点id和作品在站点的id查询作品列表失败，查询参数不能为空')
    return this.dao.listBySiteIdAndSiteWorkIds(siteIdAndSiteWorkIds)
  }

  /**
   * 根据作品集id列表批量查询
   * @param workSetIds 作品集id列表
   */
  public async listWorkWithWorkSetIdByWorkSetIds(workSetIds: number[]): Promise<WorkWithWorkSetId[]> {
    return this.dao.listWorkWithWorkSetIdByWorkSetIds(workSetIds)
  }
}
