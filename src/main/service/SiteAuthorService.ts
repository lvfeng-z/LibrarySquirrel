import BaseService from './BaseService.ts'
import SiteAuthor from '../model/entity/SiteAuthor.ts'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthorDao from '../dao/SiteAuthorDao.ts'
import StringUtil from '../util/StringUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import lodash from 'lodash'
import DB from '../database/DB.ts'
import ReWorksAuthor from '../model/entity/ReWorksAuthor.ts'
import { ReWorksAuthorTypeEnum } from '../constant/ReWorksAuthorTypeEnum.ts'
import ReWorksAuthorService from './ReWorksAuthorService.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import SiteAuthorDTO from '../model/dto/SiteAuthorDTO.ts'
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import Page from '../model/util/Page.ts'
import SelectItem from '../model/util/SelectItem.ts'
import { Operator } from '../constant/CrudConstant.js'

/**
 * 站点作者Service
 */
export default class SiteAuthorService extends BaseService<SiteAuthorQueryDTO, SiteAuthor, SiteAuthorDao> {
  constructor(db?: DB) {
    super('SiteAuthorService', new SiteAuthorDao(db), db)
  }

  /**
   * 基于站点作者id保存或更新站点作者
   * @param siteAuthor
   */
  public async saveOrUpdateBySiteAuthorId(siteAuthor: SiteAuthor): Promise<number> {
    if (isNullish(siteAuthor.siteId)) {
      const msg = '保存作品时，作品的站点id意外为空'
      LogUtil.error('SiteAuthorService', msg)
      throw new Error(msg)
    } else if (isNullish(siteAuthor.siteAuthorId)) {
      const msg = '保存作品时，站点作者的id意外为空'
      LogUtil.error('SiteAuthorService', '保存作品时，站点作者的id意外为空')
      throw new Error(msg)
    } else {
      const oldSiteAuthor = await this.getBySiteAuthorId(siteAuthor.siteAuthorId, siteAuthor.siteId)
      const newSiteAuthor = lodash.cloneDeep(siteAuthor)

      if (oldSiteAuthor !== undefined) {
        // 调整新数据
        newSiteAuthor.id = oldSiteAuthor.id
        newSiteAuthor.siteAuthorNameBefore = oldSiteAuthor.siteAuthorNameBefore
        newSiteAuthor.createTime = undefined
        newSiteAuthor.updateTime = undefined
        // 如果站点作者的名称变更，对原本的名称写入到siteAuthorNameBefore
        if (
          newSiteAuthor.siteAuthorName !== oldSiteAuthor.siteAuthorName &&
          oldSiteAuthor.siteAuthorName !== undefined &&
          oldSiteAuthor.siteAuthorName !== null
        ) {
          ;(newSiteAuthor.siteAuthorNameBefore as string[]).push(oldSiteAuthor.siteAuthorName)
        }
        return await this.updateById(newSiteAuthor)
      } else {
        await this.save(newSiteAuthor)
        return 1
      }
    }
  }

  /**
   * 基于站点作者id批量保存或更新站点作者
   * @param siteAuthors
   */
  public async saveOrUpdateBatchBySiteAuthorId(siteAuthors: SiteAuthor[]): Promise<number> {
    const siteAuthorIds = siteAuthors.map((siteAuthor) => siteAuthor.siteAuthorId) as string[]
    const oldSiteAuthors = await this.dao.listBySiteAuthorIds(siteAuthorIds)
    const newSiteAuthors: SiteAuthor[] = []
    siteAuthors.forEach((siteAuthor) => {
      if (isNullish(siteAuthor.siteAuthorId)) {
        const msg = '保存作品时，站点作者的id意外为空'
        LogUtil.error('SiteAuthorService', '保存作品时，站点作者的id意外为空')
        throw new Error(msg)
      } else if (isNullish(siteAuthor.siteId)) {
        const msg = '保存作品时，作品的站点id意外为空'
        LogUtil.error('SiteAuthorService', msg)
        throw new Error(msg)
      } else {
        const oldSiteAuthor = oldSiteAuthors.find((oldSiteAuthor) => oldSiteAuthor.siteAuthorId === siteAuthor.siteAuthorId)
        const newSiteAuthor = lodash.cloneDeep(siteAuthor)

        if (oldSiteAuthor !== undefined) {
          // 调整新数据
          newSiteAuthor.id = oldSiteAuthor.id
          newSiteAuthor.siteAuthorNameBefore = oldSiteAuthor.siteAuthorNameBefore
          newSiteAuthor.createTime = undefined
          newSiteAuthor.updateTime = undefined
          // 如果站点作者的名称变更，对原本的名称写入到siteAuthorNameBefore
          if (
            newSiteAuthor.siteAuthorName !== oldSiteAuthor.siteAuthorName &&
            oldSiteAuthor.siteAuthorName !== undefined &&
            oldSiteAuthor.siteAuthorName !== null
          ) {
            ;(newSiteAuthor.siteAuthorNameBefore as string[]).push(oldSiteAuthor.siteAuthorName)
          }
        }
        newSiteAuthors.push(newSiteAuthor)
      }
    })
    return super.saveOrUpdateBatchById(newSiteAuthors)
  }

  /**
   * 站点作者绑定在本地作者上
   * @param localAuthorId
   * @param siteAuthorIds
   */
  async updateBindLocalAuthor(localAuthorId: string | null, siteAuthorIds: string[]) {
    if (localAuthorId !== undefined) {
      if (siteAuthorIds != undefined && siteAuthorIds.length > 0) {
        return (await this.dao.updateBindLocalAuthor(localAuthorId, siteAuthorIds)) > 0
      } else {
        return true
      }
    } else {
      LogUtil.error('SiteAuthorService', '站点作者绑定在本地作者上时，localAuthorId意外为undefined')
      return false
    }
  }

  /**
   * 查询本地作者绑定或未绑定的站点作者
   * @param page
   */
  async queryBoundOrUnboundInLocalAuthorPage(page: Page<SiteAuthorQueryDTO, SiteAuthor>) {
    // 使用构造函数创建对象，补充缺失的方法和属性
    page = new Page(page)

    const tempPage = await this.dao.querySiteAuthorWithLocalAuthorPage(page)
    const selectItems = tempPage.data?.map(
      (siteAuthorDTO) =>
        new SelectItem({
          extraData: undefined,
          label: siteAuthorDTO.siteAuthorName,
          rootId: undefined,
          subLabels: [StringUtil.isNotBlank(siteAuthorDTO.site?.siteName) ? siteAuthorDTO.site?.siteName : '?'],
          value: String(siteAuthorDTO.id)
        })
    )

    const resultPage = tempPage.transform<SelectItem>()
    resultPage.data = selectItems
    return resultPage
  }

  /**
   * 更新最后使用的时间
   * @param ids
   */
  public async updateLastUse(ids: number[]) {
    const entities = ids.map((id) => {
      const temp = new SiteAuthor()
      temp.id = id
      temp.lastUse = Date.now()
      return temp
    })
    return this.dao.updateBatchById(entities)
  }

  /**
   * 根据站点作者id和站点id查询站点作者
   * @param siteAuthorId
   * @param siteId
   */
  public async getBySiteAuthorId(siteAuthorId: string, siteId: number): Promise<SiteAuthor | undefined> {
    if (StringUtil.isNotBlank(siteAuthorId)) {
      const queryDTO = new SiteAuthorQueryDTO()
      queryDTO.siteAuthorId = siteAuthorId
      queryDTO.siteId = siteId
      queryDTO.sort = { createTime: false }

      const siteAuthors = await this.dao.list(queryDTO)
      if (siteAuthors.length === 1) {
        return siteAuthors[0]
      }
      if (siteAuthors.length > 1) {
        LogUtil.warn('SiteAuthorService', `站点作者id：${siteAuthorId}在数据库中存在多个作者`)
        return siteAuthors[0]
      }
      return undefined
    } else {
      const msg = '根据站点作者id查询站点作者时站点作者id意外为空'
      LogUtil.error('SiteAuthorService', msg)
      throw new Error(msg)
    }
  }

  /**
   * 关联作品和作者
   * @param siteAuthorDTOs
   * @param worksDTO
   */
  async link(siteAuthorDTOs: SiteAuthorDTO[], worksDTO: WorksDTO) {
    const reWorksAuthors = siteAuthorDTOs.map((siteAuthorDTO) => {
      const reWorksAuthor = new ReWorksAuthor()
      reWorksAuthor.worksId = worksDTO.id as number
      reWorksAuthor.authorRole = siteAuthorDTO.authorRole
      reWorksAuthor.siteAuthorId = siteAuthorDTO.id as number
      reWorksAuthor.type = ReWorksAuthorTypeEnum.SITE
      return reWorksAuthors
    })

    // 调用ReWorksAuthorService前区分是否为注入式DB
    let reWorksAuthorService: ReWorksAuthorService
    if (this.injectedDB) {
      reWorksAuthorService = new ReWorksAuthorService(this.db)
    } else {
      reWorksAuthorService = new ReWorksAuthorService()
    }

    return reWorksAuthorService.saveBatch(reWorksAuthors, true)
  }

  /**
   * 分页查询SelectItem
   * @param page 分页查询参数
   */
  public async querySelectItemPage(page: Page<SiteAuthorQueryDTO, SiteAuthor>): Promise<Page<SiteAuthorQueryDTO, SelectItem>> {
    page = new Page(page)
    if (notNullish(page.query)) {
      page.query.operators = {
        ...{ siteAuthorName: Operator.LIKE },
        ...page.query.operators
      }
    }
    return this.dao.querySelectItemPage(page)
  }
}
