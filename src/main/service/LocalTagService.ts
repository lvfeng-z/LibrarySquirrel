import LocalTag from '../models/LocalTag'
import LocalTagDao from '../dao/LocalTagDao'
import LocalTagQueryDTO from '../models/queryDTO/SiteTagQueryDTO'
import SelectVO from '../models/utilModels/SelectVO'

async function insert(localTag: LocalTag) {
  await LocalTagDao.insert(localTag)
}

async function query(localTag: LocalTag): Promise<LocalTag[]> {
  return await LocalTagDao.query(localTag)
}

async function getSelectList(localTagQueryDTO: LocalTagQueryDTO): Promise<SelectVO[]> {
  return await LocalTagDao.getSelectList(localTagQueryDTO)
}

export default {
  insert,
  query,
  getSelectList
}
