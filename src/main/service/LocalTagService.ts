import LocalTag from '../model/LocalTag'
import LocalTagDao from '../dao/LocalTagDao'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO'
import SelectVO from '../model/utilModels/SelectVO'

async function insert(localTag: LocalTag) {
  await LocalTagDao.insert(localTag)
}

async function query(queryDTO: LocalTagQueryDTO): Promise<LocalTag[]> {
  return await LocalTagDao.query(queryDTO)
}

async function getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectVO[]> {
  return await LocalTagDao.getSelectList(queryDTO)
}

export default {
  insert,
  query,
  getSelectList
}
