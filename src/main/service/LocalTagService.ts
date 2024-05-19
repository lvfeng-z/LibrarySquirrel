import LocalTag from '../model/LocalTag.ts'
import LocalTagDao from '../dao/LocalTagDao.ts'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import ApiUtil from '../util/ApiUtil.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import LocalTagConstant from '../constant/LocalTagConstant.ts'
import TreeSelectNode from '../model/utilModels/TreeSelectNode.ts'
import TreeNode from '../model/utilModels/TreeNode.ts'

/**
 * 新增
 * @param localTag
 */
async function save(localTag: LocalTag) {
  const dao = new LocalTagDao()
  // 未设置基础标签id的话，默认设置为0
  if (localTag.baseLocalTagId === undefined) {
    localTag.baseLocalTagId = 0
  }

  return ApiUtil.response(await dao.save(localTag))
}

/**
 * 删除
 * @param id
 */
async function deleteById(id: number) {
  const dao = new LocalTagDao()
  return ApiUtil.check((await dao.deleteById(id)) > 0)
}

/**
 * 修改
 * @param localTag
 */
async function updateById(localTag: LocalTag) {
  const dao = new LocalTagDao()
  if (localTag.id) {
    if (localTag.baseLocalTagId !== undefined && localTag.baseLocalTagId === localTag.id) {
      return ApiUtil.error('基础标签不能为自身')
    }

    if (localTag.baseLocalTagId === null) {
      localTag.baseLocalTagId = 0
    }

    // 查询新上级节点的所有上级节点
    if (localTag.baseLocalTagId !== undefined && localTag.baseLocalTagId !== 0) {
      const parentTags = await dao.selectParentNode(localTag.baseLocalTagId)
      const parentTagIds = parentTags.map((tag) => tag.id)
      // 如果新的上级节点是原本的下级节点，则先把原本的下级节点移动至与本节点相同上级节点之下，再把本节点变成原下级节点的下级节点
      if (parentTagIds.includes(localTag.id)) {
        // 查询要修改的标签原本的数据
        const old = await dao.getById(localTag.id)

        const newBaseLocalTag = new LocalTag()
        newBaseLocalTag.id = localTag.baseLocalTagId
        newBaseLocalTag.baseLocalTagId = old.baseLocalTagId
        const result = (await dao.updateById(newBaseLocalTag.id, newBaseLocalTag)) <= 0
        if (result) {
          return ApiUtil.error('更新原下级节点时出错')
        }
      }
    }
    return ApiUtil.check((await dao.updateById(localTag.id, localTag)) > 0)
  } else {
    return ApiUtil.error('本地标签更新时，id意外为空')
  }
}

/**
 * 查询
 * @param page
 */
async function queryPage(page: PageModel<LocalTagQueryDTO, LocalTag>) {
  const dao = new LocalTagDao()
  return ApiUtil.response(await dao.queryPage(page))
}

/**
 * 主键查询
 * @param id
 */
async function getById(id: number) {
  const dao = new LocalTagDao()
  return ApiUtil.response(await dao.getById(id))
}

/**
 * 获取本地标签树形结构
 * @param rootId
 */
async function getTree(rootId: number) {
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
  const tree = treeUtil.buildTree(treeNodes, rootId)

  return ApiUtil.response(tree)
}

/**
 * 获取SelectItem列表
 * @param queryDTO
 */
async function getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectItem[]> {
  const dao = new LocalTagDao()
  return await dao.getSelectList(queryDTO)
}

export default {
  save,
  deleteById,
  updateById,
  queryPage,
  getById,
  getTree,
  getSelectList
}
