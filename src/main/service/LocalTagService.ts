import LocalTag from '../model/LocalTag.ts'
import LocalTagDao from '../dao/LocalTagDao.ts'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import LocalTagConstant from '../constant/LocalTagConstant.ts'
import TreeSelectNode from '../model/utilModels/TreeSelectNode.ts'
import { buildTree } from '../util/TreeUtil.ts'
import BaseService from './BaseService.ts'
import LogUtil from '../util/LogUtil.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import DB from '../database/DB.ts'
import ReWorksTag from '../model/ReWorksTag.ts'
import { ReWorksTagTypeEnum } from '../constant/ReWorksTagTypeEnum.ts'
import { ReWorksTagService } from './ReWorksTagService.ts'
import { isNullish, notNullish } from '../util/CommonUtil.ts'

export default class LocalTagService extends BaseService<LocalTagQueryDTO, LocalTag, LocalTagDao> {
  constructor(db?: DB) {
    super('LocalTagService', new LocalTagDao(db), db)
  }

  /**
   * 保存
   * @param localTag 本地标签
   */
  async save(localTag: LocalTag) {
    if (isNullish(localTag.baseLocalTagId)) {
      localTag.baseLocalTagId = 0
    }
    return this.dao.save(localTag)
  }

  /**
   * 修改
   * @param localTag
   */
  async updateById(localTag: LocalTag) {
    if (localTag.id) {
      if (localTag.baseLocalTagId !== undefined && localTag.baseLocalTagId === localTag.id) {
        const msg = '基础标签不能为自身'
        LogUtil.error('LocalTagService', msg)
        throw new Error(msg)
      }

      if (isNullish(localTag.baseLocalTagId)) {
        localTag.baseLocalTagId = 0
      }

      // 查询新上级节点的所有上级节点
      if (localTag.baseLocalTagId !== 0) {
        const parentTags = await this.dao.selectParentNode(localTag.baseLocalTagId)
        const parentTagIds = parentTags.map((tag) => tag.id)
        // 如果新的上级节点是原本的下级节点，则先把原本的下级节点移动至本节点的上级节点之下，再把本节点变成原下级节点的下级节点
        if (parentTagIds.includes(localTag.id)) {
          // 查询要修改的标签原本的数据
          const old = await this.dao.getById(localTag.id)
          if (isNullish(old)) {
            const msg = '修改本地标签时，原标签信息意外为空'
            LogUtil.error('LocalTagService', msg)
            throw new Error(msg)
          }

          const newBaseLocalTag = new LocalTag()
          newBaseLocalTag.id = localTag.baseLocalTagId
          newBaseLocalTag.baseLocalTagId = old.baseLocalTagId
          const result = (await this.dao.updateById(newBaseLocalTag.id, newBaseLocalTag)) <= 0
          if (result) {
            const msg = '更新原下级节点时出错'
            LogUtil.error('LocalTagService', msg)
            throw new Error(msg)
          }
        }
      }
      return await this.dao.updateById(localTag.id, localTag)
    } else {
      const msg = '更新本地标签时，id意外为空'
      LogUtil.error('LocalTagService', msg)
      throw new Error(msg)
    }
  }

  /**
   * 关联作品和标签
   * @param localTags
   * @param worksDTO
   */
  async link(localTags: LocalTag[], worksDTO: WorksDTO) {
    // 校验
    const legalLocalTags = localTags.filter((localTag) => {
      if (isNullish(localTag)) {
        LogUtil.warn('LocalTagService', `关联作品和本地标签时，标签意外为空`)
        return false
      }
      if (isNullish(!Object.hasOwn(localTag, 'id') || localTag.id)) {
        const localTagName = Object.hasOwn(localTag, 'localTagName')
          ? localTag.localTagName
          : 'unknown'
        LogUtil.warn(
          'LocalTagService',
          `关联作品和本地标签时，标签id意外为空，localTagName: ${localTagName}`
        )
        return false
      }
      return true
    })

    if (legalLocalTags.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = legalLocalTags.map((localTag) => {
      const reWorksTag = new ReWorksTag()
      reWorksTag.worksId = worksDTO.id as number
      reWorksTag.localTagId = localTag.id
      reWorksTag.tagType = ReWorksTagTypeEnum.LOCAL
      return reWorksTag
    })

    // 调用reWorksTagService前区分是否为注入式的DB
    let reWorksTagService: ReWorksTagService
    if (this.injectedDB) {
      reWorksTagService = new ReWorksTagService(this.db)
    } else {
      reWorksTagService = new ReWorksTagService()
    }

    return reWorksTagService.saveBatch(links, true)
  }

  /**
   * 分页查询
   * @param page
   */
  public async selectPage(
    page: PageModel<LocalTagQueryDTO, LocalTag>
  ): Promise<PageModel<LocalTagQueryDTO, LocalTag>> {
    try {
      if (notNullish(page.query)) {
        page.query.assignComparator = {
          ...{ localTagName: COMPARATOR.LIKE },
          ...page.query.assignComparator
        }
      }
      return super.selectPage(page)
    } catch (error) {
      LogUtil.error('LocalTagService', error)
      throw error
    }
  }

  /**
   * 获取本地标签树形结构
   * @param rootId
   */
  async getTree(rootId: number) {
    if (rootId === undefined) {
      rootId = LocalTagConstant.ROOT_LOCAL_TAG_ID
    }

    // 递归查询rootId的子节点
    const localTags = await this.dao.selectTreeNode(rootId)
    // 子节点转换为TreeSelectNode类型
    const treeNodes = localTags.map((localTag) => {
      const treeSelectNode = new TreeSelectNode()
      treeSelectNode.children = []
      treeSelectNode.extraData = undefined
      treeSelectNode.id = localTag.id as number
      treeSelectNode.label = localTag.localTagName
      treeSelectNode.pid = localTag.baseLocalTagId as number
      treeSelectNode.secondaryLabel = ''
      treeSelectNode.value = localTag.id as number
      return treeSelectNode
    })

    // 递归生成树结构
    return buildTree(treeNodes, rootId)
  }

  /**
   * 获取SelectItem列表
   * @param queryDTO
   */
  async getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectItem[]> {
    const result = this.dao.getSelectList(queryDTO)
    // extraData.tagType=true表示这些标签是本地的
    return result.then((res) => {
      return res.map((selectItem) => {
        selectItem.extraData = { tagType: true }
        return selectItem
      })
    })
  }

  /**
   * 分页查询SelectItem
   * @param page
   */
  async getSelectItemPage(
    page: PageModel<LocalTagQueryDTO, LocalTag>
  ): Promise<PageModel<LocalTagQueryDTO, SelectItem>> {
    if (page !== undefined && Object.hasOwnProperty.call(page, 'query')) {
      page.query = new LocalTagQueryDTO(page.query)
      page.query.assignComparator = { localTagName: COMPARATOR.LIKE }
    }
    return await this.dao.getSelectItemPage(page, 'id', 'localTagName')
  }

  /**
   * 查询作品的本地标签
   * @param worksId 作品id
   */
  async listByWorksId(worksId: number): Promise<LocalTag[]> {
    return this.dao.listByWorksId(worksId)
  }

  /**
   * 分页查询作品的本地标签的SelectItem
   * @param page
   */
  async listSelectItemPageByWorksId(
    page: PageModel<LocalTagQueryDTO, LocalTag>
  ): Promise<PageModel<LocalTagQueryDTO, SelectItem>> {
    page = new PageModel(page)
    if (notNullish(page.query)) {
      page.query.assignComparator = {
        ...{ localTagName: COMPARATOR.LIKE },
        ...page.query.assignComparator
      }
    }
    const sourcePage = await this.dao.selectPageByWorksId(page)

    // 根据localTag数据生成SelectItem
    const sourceData = sourcePage.data
    const resultPage = sourcePage.transform<SelectItem>()
    if (notNullish(sourceData)) {
      resultPage.data = sourceData.map((localTag) => {
        const tempSelectItem = new SelectItem()
        tempSelectItem.value = localTag.id
        tempSelectItem.label = localTag.localTagName
        return tempSelectItem
      })
    }
    return resultPage
  }
}
