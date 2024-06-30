import BaseService from './BaseService.ts'
import SiteAuthor from '../model/SiteAuthor.ts'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthorDao from '../dao/SiteAuthorDao.ts'
import StringUtil from '../util/StringUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import lodash from 'lodash'
import DB from '../database/DB.ts'

/**
 * 站点作者Service
 */
export default class SiteAuthorService extends BaseService<SiteAuthorQueryDTO, SiteAuthor> {
  constructor(db?: DB) {
    super('SiteAuthorService', new SiteAuthorDao(db), db)
  }

  /**
   * 基于站点作者id保存或更新站点作者
   * @param siteAuthor
   */
  public async saveOrUpdateBySiteAuthorId(siteAuthor: SiteAuthor): Promise<number> {
    if (siteAuthor.siteId === undefined || siteAuthor.siteId === null) {
      const msg = '保存作品时，作品的站点id意外为空'
      LogUtil.error('SiteAuthorService', msg)
      throw new Error(msg)
    } else if (siteAuthor.siteAuthorId === undefined || siteAuthor.siteAuthorId === null) {
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
    const dao = new SiteAuthorDao()
    const siteAuthorIds = siteAuthors.map((siteAuthor) => siteAuthor.siteAuthorId) as string[]
    const oldSiteAuthors = await dao.selectListBySiteAuthorIds(siteAuthorIds)
    const newSiteAuthors: SiteAuthor[] = []
    siteAuthors.forEach((siteAuthor) => {
      if (siteAuthor.siteAuthorId === undefined || siteAuthor.siteAuthorId === null) {
        const msg = '保存作品时，站点作者的id意外为空'
        LogUtil.error('SiteAuthorService', '保存作品时，站点作者的id意外为空')
        throw new Error(msg)
      } else if (siteAuthor.siteId === undefined || siteAuthor.siteId === null) {
        newSiteAuthors.push(siteAuthor)
      } else {
        const oldSiteAuthor = oldSiteAuthors.find(
          (oldSiteAuthor) => oldSiteAuthor.siteAuthorId === siteAuthor.siteAuthorId
        )
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
          newSiteAuthors.push(newSiteAuthor)
        }
      }
    })
    return super.saveOrUpdateBatchById(newSiteAuthors)
  }

  /**
   * 根据站点作者id和站点id查询站点作者
   * @param siteAuthorId
   * @param siteId
   */
  public async getBySiteAuthorId(
    siteAuthorId: string,
    siteId: number
  ): Promise<SiteAuthor | undefined> {
    if (StringUtil.isNotBlank(siteAuthorId)) {
      const dao = new SiteAuthorDao()

      const queryDTO = new SiteAuthorQueryDTO()
      queryDTO.siteAuthorId = siteAuthorId
      queryDTO.siteId = siteId
      queryDTO.sort = [{ column: 'createTime', order: 'desc' }]

      const siteAuthors = await dao.selectList(queryDTO)
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
}
