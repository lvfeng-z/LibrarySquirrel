import DB from '../database/DB.ts'
import Database from 'better-sqlite3'
import { DataBasePath } from '../util/DatabaseUtil.ts'
import DataBaseConstant from '../constant/DataBaseConstant.ts'
import pLimit from 'p-limit'
import PluginService from '../service/PluginService.js'
import path from 'path'
import { RootDir } from '../util/FileSysUtil.js'
import LogUtil from '../util/LogUtil.js'
import { GlobalVar, GlobalVars } from '../global/GlobalVar.js'

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
      db.run(sql)
    }
    console.log('循环结束')
  } finally {
    db.release()
  }
}

async function transactionTest() {
  const db = new Database(DataBasePath() + DataBaseConstant.DB_FILE_NAME)
  const p1 = db.prepare("insert into site_author (site_author_id, site_author_name) values (1, 'test1')")
  const p2 = db.prepare("insert into site_author (site_author_id, site_author_name) values (2, 'test2')")
  const p3 = db.prepare("insert into site_author (site_author_id, site_author_name) values (3, 'test3')")
  const t = db.transaction(() => {
    p1.run()
    p2.run()
    p3.run()
  })
  t()
}

async function pLimitTest() {
  const limit = pLimit(3)
  const fetchSomething = async (t: string) => {
    console.log('执行', t)
    setTimeout(() => {
      return
    }, 1000)
  }
  const list: Promise<void>[] = []
  for (let i = 0; i < 11; i++) {
    list.push(limit(() => fetchSomething(i.toString())))
  }
  await Promise.all(list)
}

async function installPluginTest() {
  const pluginService = new PluginService()
  const localPluginInstalled = await pluginService.checkInstalled('task', 'lvfeng', 'local', '1.0.0')
  LogUtil.info('test----', localPluginInstalled ? '已安装' : '未安装')
  if (!localPluginInstalled) {
    let installPath: string
    const NODE_ENV = process.env.NODE_ENV
    if (NODE_ENV == 'development') {
      installPath = path.join(RootDir(), '/resources/initialization/localTaskHandler.zip')
    } else {
      installPath = path.join(RootDir(), '/resources/app.asar.unpacked/initialization/localTaskHandler.zip')
    }
    pluginService.installPlugin(installPath)
  }
}

async function mainWindowMsgTest() {
  const gotoPageProps = { title: '需要设置工作目录', content: '请先设置工作目录', buttonText: '去设置' }
  const mainWindow = GlobalVar.get(GlobalVars.MAIN_WINDOW)
  mainWindow.webContents.send('goto-page', gotoPageProps)
}

export default {
  insertLocalTag10W,
  transactionTest,
  pLimitTest,
  installPluginTest,
  mainWindowMsgTest
}
