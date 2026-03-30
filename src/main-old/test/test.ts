
import pLimit from 'p-limit'
import GotoPageConfig from '@shared/model/util/GotoPageConfig.js'
import { PageEnum } from '../constant/PageEnum.js'
import WorkSetService from '../service/WorkSetService.ts'
import { getMainWindow } from '../core/mainWindow.ts'
import { Database } from '../database/Database.ts'
import { transactional } from '../database/Transactional.ts'

async function transactionTest() {
  const p1 = await Database.run("insert into site_author (site_author_id, author_name) values (111, 'test1')")
  console.log(p1)
  await transactional('test', async () => {
    const p2 = await Database.run("insert into site_author (site_author_id, author_name) values (222, 'test2')")
    console.log(p2)
    const p3 = await Database.run("insert into site_author (site_author_id, author_name) values (333, 'test3')")
    console.log(p3)
    if (p2.changes === 11) {
      return 1
    }
    throw new Error('test')
  })
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
