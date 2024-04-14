import LocalTag from '../models/LocalTag'
import LocalTagDao from '../dao/LocalTagDao'

async function insert(localTag: LocalTag) {
  await LocalTagDao.insert(localTag)
}

async function query(localTag: LocalTag): Promise<LocalTag[]> {
  return await LocalTagDao.query(localTag)
}

function getSelectList(keyword: string) {
  return LocalTagDao.getSelectList(keyword)
}

export default {
  insert,
  query,
  getSelectList
}
