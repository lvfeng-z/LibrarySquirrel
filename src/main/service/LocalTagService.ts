import LocalTag from '../model/LocalTag'
import { LocalTagDao } from '../dao/LocalTagDao'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO'
import SelectItem from '../model/utilModels/SelectItem'
import { ApiUtil } from '../util/ApiUtil'
import { PageModel } from '../model/utilModels/PageModel'
import LocalTagConstant from '../constant/LocalTagConstant'
import TreeSelectNode from '../model/utilModels/TreeSelectNode'
import TreeNode from '../model/utilModels/TreeNode'
import StringUtil from '../util/StringUtil'

/**
 * 新增
 * @param localTag
 */
async function save(localTag: LocalTag) {
  const dao = new LocalTagDao()
  // 未设置基础标签id的话，默认设置为0
  if (StringUtil.isBlank(localTag.baseLocalTagId)) {
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
