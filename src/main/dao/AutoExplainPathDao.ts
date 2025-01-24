import BaseDao from './BaseDao.ts'
import AutoExplainPathQueryDTO from '../model/queryDTO/AutoExplainPathQueryDTO.ts'
import AutoExplainPath from '../model/entity/AutoExplainPath.ts'
import DB from '../database/DB.ts'
import Page from '../model/util/Page.ts'
import lodash from 'lodash'
import StringUtil from '../util/StringUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import { IsNullish } from '../util/CommonUtil.js'

/**
 * 自动解释路径含义Dao
 */
export default class AutoExplainPathDao extends BaseDao<AutoExplainPathQueryDTO, AutoExplainPath> {
  constructor(db?: DB) {
    super('auto_explain_path', AutoExplainPath, db)
  }

  /**
   * 分页查询监听此path的自动解释
   * @param page
   */
  async getListenerPage(
    page: Page<AutoExplainPathQueryDTO, AutoExplainPath>
  ): Promise<Page<AutoExplainPathQueryDTO, AutoExplainPath>> {
    const path = page.query?.path
    // 校验
    if (StringUtil.isBlank(path)) {
      const msg = '分页查询自动解释失败，path不能为空'
      LogUtil.error('', msg)
      throw new Error(msg)
    }

    // 组装sql
    const selectClause = `SELECT * FROM auto_explain_path`
    const whereClause = `'${path}' REGEXP regular_expression`
    let statement = selectClause.concat(' WHERE ', whereClause)

    // 查询和转换
    const resultPage = lodash.cloneDeep(page)
    const sort = IsNullish(page.query?.sort) ? {} : page.query.sort
    statement = await super.sortAndPage(statement, resultPage, sort)
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => {
        resultPage.data = super.toResultTypeDataList<AutoExplainPath>(rows)
        return resultPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 查询监听此path的自动解释列表
   * @param path
   */
  async getListenerList(path: string): Promise<AutoExplainPath[]> {
    const statement = `SELECT * FROM auto_explain_path WHERE '${path}' REGEXP regular_expression`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => super.toResultTypeDataList<AutoExplainPath>(rows))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
