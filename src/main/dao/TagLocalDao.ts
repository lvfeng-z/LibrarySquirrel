import TagLocal from '../models/TagLocal'

async function insertTagLocal(tagLocal: TagLocal) {
  const statement = await global.connectionPool.acquire()
  statement
    .prepare(
      'insert into tag_local (id, local_tag_name, base_local_tag_id) values (@id, @localTagName, @baseLocalTagId)'
    )
    .run(tagLocal)
}

export default {
  insertTagLocal
}
