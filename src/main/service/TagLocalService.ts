import TagLocal from '../models/TagLocal'
import TagLocalDao from '../dao/TagLocalDao'

async function insert(tagLocal: TagLocal) {
  await TagLocalDao.insertTagLocal(tagLocal)
}

async function query(tagLocal: TagLocal): Promise<TagLocal[]> {
  return await TagLocalDao.queryTagLocal(tagLocal)
}

function getSelectList(keyword: string) {
  return TagLocalDao.getSelectList(keyword)
}

export default {
  insert,
  query,
  getSelectList
}
