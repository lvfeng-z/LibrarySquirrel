import LocalTag from '../model/LocalTag.ts'
import LocalTagDao from '../dao/LocalTagDao.ts'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import LocalTagConstant from '../constant/LocalTagConstant.ts'
import TreeSelectNode from '../model/utilModels/TreeSelectNode.ts'
import TreeNode from '../model/utilModels/TreeNode.ts'
import BaseService from './BaseService.ts'
import LogUtil from '../util/LogUtil.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import DB from '../database/DB.ts'

export default class LocalTagService extends BaseService<LocalTagQueryDTO, LocalTag> {
  constructor(db?: DB) {
    super('LocalTagService', new LocalTagDao(db))
  }

  /**
   * 保存
   * @param localTag 本地标签
   */
  async save(localTag: LocalTag) {
    if (localTag.baseLocalTagId === undefined || localTag.baseLocalTagId === null) {
      localTag.baseLocalTagId = 0
    }
    return this.dao.save(localTag)
  }

  /**
   * 修改
   * @param localTag
   */
  async updateById(localTag: LocalTag) {
    const dao = new LocalTagDao()
    if (localTag.id) {
      if (localTag.baseLocalTagId !== undefined && localTag.baseLocalTagId === localTag.id) {
        const msg = '基础标签不能为自身'
        LogUtil.error('LocalTagService', msg)
        throw new Error(msg)
      }

      if (localTag.baseLocalTagId === undefined || localTag.baseLocalTagId === null) {
        localTag.baseLocalTagId = 0
      }

      // 查询新上级节点的所有上级节点
      if (localTag.baseLocalTagId !== 0) {
        const parentTags = await dao.selectParentNode(localTag.baseLocalTagId)
        const parentTagIds = parentTags.map((tag) => tag.id)
        // 如果新的上级节点是原本的下级节点，则先把原本的下级节点移动至本节点的上级节点之下，再把本节点变成原下级节点的下级节点
        if (parentTagIds.includes(localTag.id)) {
          // 查询要修改的标签原本的数据
          const old = await dao.getById(localTag.id)

          const newBaseLocalTag = new LocalTag()
          newBaseLocalTag.id = localTag.baseLocalTagId
          newBaseLocalTag.baseLocalTagId = old.baseLocalTagId
          const result = (await dao.updateById(newBaseLocalTag.id, newBaseLocalTag)) <= 0
          if (result) {
            const msg = '更新原下级节点时出错'
            LogUtil.error('LocalTagService', msg)
            throw new Error(msg)
          }
        }
      }
      return await dao.updateById(localTag.id, localTag)
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
    // localTags.map(localTag => {
    // })
    console.log(localTags, worksDTO)
  }

  /**
   * 获取本地标签树形结构
   * @param rootId
   */
  async getTree(rootId: number) {
    if (rootId === undefined) {
      rootId = LocalTagConstant.ROOT_LOCAL_TAG_ID
    }
    const dao = new LocalTagDao()

    // 递归查询rootId的子节点
    const localTags = await dao.selectTreeNode(rootId)
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
    const treeUtil = new TreeNode<TreeSelectNode>()
    return treeUtil.buildTree(treeNodes, rootId)
  }

  /**
   * 获取SelectItem列表
   * @param queryDTO
   */
  async getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectItem[]> {
    const dao = new LocalTagDao()
    const result = dao.getSelectList(queryDTO)
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
    const dao = new LocalTagDao()
    if (page !== undefined && Object.hasOwnProperty.call(page, 'query')) {
      page.query = new LocalTagQueryDTO(page.query)
      page.query.assignComparator = { localTagName: COMPARATOR.LIKE }
    }
    return await dao.getSelectItemPage(page, 'id', 'localTagName')
  }
}
