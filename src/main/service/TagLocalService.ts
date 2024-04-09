import TagLocal from '../models/TagLocal'
import TagLocalDao from '../dao/TagLocalDao'

async function insertTagLocalService(tagLocal: TagLocal) {
  await TagLocalDao.insertTagLocal(tagLocal)
}

export default {
  insertTagLocalService
}
