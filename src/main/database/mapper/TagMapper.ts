import { db } from '../util/DatabaseUtil'
import Tag from '../../models/Tag'

// 查询
export function query() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM tag', (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

export function baseInsert(tag: Tag) {
  const query = 'INSERT INTO tag (id, tag_source, name, base_tag) VALUES (?, ?, ?, ?)'
  db.run(query, [tag.id, tag.tag_source, tag.name, tag.base_tag], (err) => {
    if (err) {
      console.error(err.message)
    }
  })
}
//
// export function baseDelete(tag: Tag) {
//     const temp = connectDB().run('' + tag.id)
//     console.log(temp)
//     return null
// }
