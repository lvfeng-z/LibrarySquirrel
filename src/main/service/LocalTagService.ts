import LocalTag from '../model/LocalTag'
import { LocalTagDao } from '../dao/LocalTagDao'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO'
import SelectVO from '../model/utilModels/SelectVO'
import { ApiUtil } from '../util/ApiUtil'

async function save(localTag: LocalTag) {
  const dao = new LocalTagDao()
  return ApiUtil.response(await dao.save(localTag))
}
async function updateById(localTag: LocalTag) {
  const dao = new LocalTagDao()
  if (localTag.id) {
    return ApiUtil.check((await dao.updateById(localTag.id, localTag)) > 0)
  } else {
    return ApiUtil.error('本地标签更新时，id意外为空')
  }
}

async function query(queryDTO: LocalTagQueryDTO): Promise<LocalTag[]> {
  const dao = new LocalTagDao()
  return await dao.query(queryDTO)
}

async function getById(id: number) {
  const dao = new LocalTagDao()
  return ApiUtil.response(await dao.getById(id))
}

async function getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectVO[]> {
  const dao = new LocalTagDao()
  return await dao.getSelectList(queryDTO)
}

export default {
  save,
  updateById,
  query,
  getById,
  getSelectList
}
