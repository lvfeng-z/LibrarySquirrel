import LocalTag from '../model/LocalTag'
import { LocalTagDao } from '../dao/LocalTagDao'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO'
import SelectVO from '../model/utilModels/SelectVO'

async function save(localTag: LocalTag) {
  const dao = new LocalTagDao()
  await dao.save(localTag)
}

async function query(queryDTO: LocalTagQueryDTO): Promise<LocalTag[]> {
  const dao = new LocalTagDao()
  return await dao.query(queryDTO)
}

async function getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectVO[]> {
  const dao = new LocalTagDao()
  return await dao.getSelectList(queryDTO)
}

export default {
  save,
  query,
  getSelectList
}
