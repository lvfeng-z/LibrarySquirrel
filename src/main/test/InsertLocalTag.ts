import DB from '../database/DB.ts'
import Database from 'better-sqlite3'
import DatabaseUtil from '../util/DatabaseUtil.ts'
import DataBaseConstant from '../constant/DataBaseConstant.ts'

async function insertLocalTag10W() {
  const db = new DB('insertLocalTag10W')
  try {
    console.log('循环开始')
    for (let i = 0; i < 300000; i++) {
      let tagName: string
      const ran = Math.random()
      const randomLetter = String.fromCharCode(Math.floor(Math.random() * 26) + 65)
      if (i % 2 === 0) {
        tagName = randomLetter + ran + 'testTagEven'
      } else {
        tagName = randomLetter + ran + 'testTagOdd'
      }
      const now = Date.now()
      const sql = `insert into local_tag (local_tag_name, base_local_tag_id, create_time, update_time)
             values ('${tagName}', ${i}, ${now}, ${now});`
      db.prepare(sql).then((statement) => {
        statement.run()
      })
    }
    console.log('循环结束')
  } finally {
    db.release()
  }
}

async function transactionTest() {
  const db = new Database(DatabaseUtil.getDataBasePath() + DataBaseConstant.DB_FILE_NAME)
  const p1 = db.prepare(
    "insert into site_author (site_author_id, site_author_name) values (1, 'test1')"
  )
  const p2 = db.prepare(
    "insert into site_author (site_author_id, site_author_name) values (2, 'test2')"
  )
  const p3 = db.prepare(
    "insert into site_author (site_author_id, site_author_name) values (3, 'test3')"
  )
  const t = db.transaction(() => {
    p1.run()
    p2.run()
    p3.run()
  })
  t()
}

export default {
  insertLocalTag10W,
  transactionTest
}
