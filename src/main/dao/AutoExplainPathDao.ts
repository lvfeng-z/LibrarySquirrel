import BaseDao from './BaseDao.ts'
import AutoExplainPathQueryDTO from '../model/queryDTO/AutoExplainPathQueryDTO.ts'
import AutoExplainPath from '../model/entity/AutoExplainPath.ts'
import DB from '../database/DB.ts'
import Page from '../model/util/Page.ts'
import lodash from 'lodash'
import StringUtil from '../util/StringUtil.ts'
import LogUtil from '../util/LogUtil.ts'

/**
 * 自动解释路径含义Dao
 */
export default class AutoExplainPathDao extends BaseDao<AutoExplainPathQueryDTO, AutoExplainPath> {
  constructor(db?: DB) {
    super('auto_explain_path', 'AutoExplainPathDao', db)
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
      const msg = '分页查询自动解释时，path不能为空'
      LogUtil.error('', msg)
      throw new Error(msg)
    }

    // 组装sql
    const selectClause = `select * from auto_explain_path`
    const whereClause = `'${path}' REGEXP regular_expression`
    let statement = selectClause.concat(' where ', whereClause)

    // 查询和转换
    const resultPage = lodash.cloneDeep(page)
    statement = await super.sorterAndPager(statement, whereClause, resultPage)
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => {
        resultPage.data = super.getResultTypeDataList<AutoExplainPath>(rows)
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
    const statement = `select * from auto_explain_path where '${path}' REGEXP regular_expression`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => super.getResultTypeDataList<AutoExplainPath>(rows))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
