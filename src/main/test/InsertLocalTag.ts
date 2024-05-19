import DB from '../database/DB'

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

export default {
  insertLocalTag10W
}
