import BaseDao from './BaseDao.ts'
import AutoExplainPathQueryDTO from '../model/queryDTO/AutoExplainPathQueryDTO.ts'
import AutoExplainPath from '../model/AutoExplainPath.ts'
import DB from '../database/DB.ts'
import PageModel from '../model/utilModels/PageModel.ts'
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

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  /**
   * 分页查询监听此path的自动解释
   * @param page
   */
  async getListenerPage(
    page: PageModel<AutoExplainPathQueryDTO, AutoExplainPath>
  ): Promise<PageModel<AutoExplainPathQueryDTO, AutoExplainPath>> {
    const db = this.acquire()
    try {
      const path = page.query?.path
      // 校验
      if (StringUtil.isBlank(path)) {
        const msg = '分页查询自动解释时，path不能为空'
        LogUtil.error('', msg)
        throw new Error(msg)
      }
      const resultPage = lodash.cloneDeep(page)

      // 组装sql
      const selectClause = `select * from auto_explain_path`
      const whereClause = `'${path}' REGEXP regular_expression`
      let statement = selectClause.concat(' where ', whereClause)

      // 查询和转换
      statement = await super.sorterAndPager(statement, whereClause, resultPage)
      const rows = (await db.all(statement)) as object[]
      resultPage.data = super.getResultTypeDataList<AutoExplainPath>(rows)
      return resultPage
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 查询监听此path的自动解释列表
   * @param path
   */
  async getListenerList(path: string): Promise<AutoExplainPath[]> {
    const db = this.acquire()
    try {
      const statement = `select * from auto_explain_path where '${path}' REGEXP regular_expression`
      const rows = (await db.all(statement)) as object[]
      return super.getResultTypeDataList<AutoExplainPath>(rows)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }
}
