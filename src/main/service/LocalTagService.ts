import LocalTag from '../model/entity/LocalTag.ts'
import LocalTagDao from '../dao/LocalTagDao.ts'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.ts'
import SelectItem from '../model/util/SelectItem.ts'
import LocalTagConstant from '../constant/LocalTagConstant.ts'
import TreeSelectNode from '../model/util/TreeSelectNode.ts'
import { buildTree } from '../util/TreeUtil.ts'
import BaseService from './BaseService.ts'
import LogUtil from '../util/LogUtil.ts'
import Page from '../model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import DB from '../database/DB.ts'
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import { assertTrue } from '../util/AssertUtil.js'

export default class LocalTagService extends BaseService<LocalTagQueryDTO, LocalTag, LocalTagDao> {
  constructor(db?: DB) {
    super('LocalTagService', new LocalTagDao(db), db)
  }

  /**
   * 保存
   * @param localTag 本地标签
   */
  public async save(localTag: LocalTag) {
    if (isNullish(localTag.baseLocalTagId)) {
      localTag.baseLocalTagId = 0
    }
    return this.dao.save(localTag)
  }

  /**
   * 修改
   * @param localTag
   */
  public async updateById(localTag: LocalTag) {
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
            const msg = '修改本地标签失败，原标签信息意外为空'
            LogUtil.error('LocalTagService', msg)
            throw new Error(msg)
          }

          const newBaseLocalTag = new LocalTag()
          newBaseLocalTag.id = localTag.baseLocalTagId
          newBaseLocalTag.baseLocalTagId = old.baseLocalTagId
          const succeed = (await this.dao.updateById(newBaseLocalTag.id, newBaseLocalTag)) > 0
          assertTrue(succeed, '更新原下级节点失败')
        }
      }
      return await this.dao.updateById(localTag.id, localTag)
    } else {
      const msg = '更新本地标签失败，id意外为空'
      LogUtil.error('LocalTagService', msg)
      throw new Error(msg)
    }
  }

  /**
   * 更新最后使用的时间
   * @param ids
   */
  public async updateLastUse(ids: number[]) {
    const entities = ids.map((id) => {
      const temp = new LocalTag()
      temp.id = id
      temp.lastUse = Date.now()
      return temp
    })
    return this.dao.updateBatchById(entities)
  }

  /**
   * 分页查询
   * @param page
   */
  public async queryPage(page: Page<LocalTagQueryDTO, LocalTag>): Promise<Page<LocalTagQueryDTO, LocalTag>> {
    try {
      page = new Page(page)
      if (notNullish(page.query)) {
        page.query.operators = {
          ...{ localTagName: Operator.LIKE },
          ...page.query.operators
        }
      }
      return super.queryPage(page)
    } catch (error) {
      LogUtil.error('LocalTagService', error)
      throw error
    }
  }

  /**
   * 获取本地标签树形结构
   * @param rootId
   */
  public async getTree(rootId: number) {
    if (isNullish(rootId)) {
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
  public async listSelectItems(queryDTO: LocalTagQueryDTO): Promise<SelectItem[]> {
    const result = this.dao.listSelectItems(queryDTO)
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
   * @param secondaryLabelName
   */
  public async querySelectItemPage(
    page: Page<LocalTagQueryDTO, LocalTag>,
    secondaryLabelName?: string
  ): Promise<Page<LocalTagQueryDTO, SelectItem>> {
    if (page !== undefined && Object.hasOwnProperty.call(page, 'query')) {
      page.query = new LocalTagQueryDTO(page.query)
      page.query.operators = { localTagName: Operator.LIKE }
    }
    return this.dao.querySelectItemPage(page, 'id', 'localTagName', secondaryLabelName)
  }

  /**
   * 查询作品的本地标签
   * @param worksId 作品id
   */
  public async listByWorksId(worksId: number): Promise<LocalTag[]> {
    return this.dao.listByWorksId(worksId)
  }

  /**
   * 分页查询作品的本地标签的SelectItem
   * @param page
   */
  public async querySelectItemPageByWorksId(page: Page<LocalTagQueryDTO, LocalTag>): Promise<Page<LocalTagQueryDTO, SelectItem>> {
    page = new Page(page)
    if (notNullish(page.query)) {
      page.query.operators = {
        ...{ localTagName: Operator.LIKE },
        ...page.query.operators
      }
    }
    const sourcePage = await this.dao.queryPageByWorksId(page)

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
