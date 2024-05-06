import LocalTag from '../model/LocalTag'
import { LocalTagDao } from '../dao/LocalTagDao'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO'
import SelectVO from '../model/utilModels/SelectVO'
import { ApiUtil } from '../util/ApiUtil'

/**
 * 新增
 * @param localTag
 */
async function save(localTag: LocalTag) {
  const dao = new LocalTagDao()
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
    return ApiUtil.check((await dao.updateById(localTag.id, localTag)) > 0)
  } else {
    return ApiUtil.error('本地标签更新时，id意外为空')
  }
}

/**
 * 查询
 * @param queryDTO
 */
async function query(queryDTO: LocalTagQueryDTO): Promise<LocalTag[]> {
  const dao = new LocalTagDao()
  return await dao.query(queryDTO)
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
 * 获取SelectVO列表
 * @param queryDTO
 */
async function getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectVO[]> {
  const dao = new LocalTagDao()
  return await dao.getSelectList(queryDTO)
}

export default {
  save,
  deleteById,
  updateById,
  query,
  getById,
  getSelectList
}
