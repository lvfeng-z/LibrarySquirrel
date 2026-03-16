import Database from 'better-sqlite3'
import { DataBasePath } from '../util/DatabaseUtil.ts'
import DataBaseConstant from '../constant/DataBaseConstant.ts'
import pLimit from 'p-limit'
import GotoPageConfig from '@shared/model/util/GotoPageConfig.js'
import { PageEnum } from '../constant/PageEnum.js'
import WorkSetService from '../service/WorkSetService.ts'
import { getMainWindow } from '../core/mainWindow.ts'

async function transactionTest() {
  const db = new Database(DataBasePath() + DataBaseConstant.DB_FILE_NAME)
  const p1 = db.prepare("insert into site_author (site_author_id, author_name) values (1, 'test1')")
  const p2 = db.prepare("insert into site_author (site_author_id, author_name) values (2, 'test2')")
  const p3 = db.prepare("insert into site_author (site_author_id, author_name) values (3, 'test3')")
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

async function mainWindowMsgTest() {
  const gotoPageProps = { title: '需要设置工作目录', content: '请先设置工作目录', buttonText: '去设置' }
  getMainWindow().webContents.send('goto-page', gotoPageProps)
}

function gotoPageSiteManage() {
  const tempDomains = ['www.pixiv.net']
  const gotoPageConfig: GotoPageConfig = {
    page: PageEnum.SiteManage,
    title: '插件创建了新的域名',
    content: '建议将新的域名绑定到站点，以免影响插件使用',
    options: {
      confirmButtonText: '去绑定',
      cancelButtonText: '以后再说',
      type: 'warning',
      showClose: false
    },
    extraData: tempDomains
  }
  getMainWindow().webContents.send('goto-page', gotoPageConfig)
}

function listWorkSetWithWorkByIds(ids: number[]) {
  const workSetService = new WorkSetService()
  return workSetService.listWorkSetWithWorkByIds(ids)
}

export default {
  transactionTest,
  pLimitTest,
  mainWindowMsgTest,
  gotoPageSiteManage,
  listWorkSetWithWorkByIds
}
