import BaseDao from '../base/BaseDao.ts'
import AutoExplainPathQueryDTO from '@shared/model/queryDTO/AutoExplainPathQueryDTO.ts'
import AutoExplainPath from '@shared/model/entity/AutoExplainPath.ts'
import { Database } from '../database/Database.ts'
import Page from '@shared/model/util/Page.ts'
import lodash from 'lodash'
import log from '../util/LogUtil.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'
import { isBlank } from '@shared/util/StringUtil.ts'

/**
 * 自动解释路径含义Dao
 */
export default class AutoExplainPathDao extends BaseDao<AutoExplainPathQueryDTO, AutoExplainPath> {
  constructor() {
    super('auto_explain_path', AutoExplainPath)
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
    if (isBlank(path)) {
      const msg = '分页查询自动解释失败，path不能为空'
      log.error('', msg)
      throw new Error(msg)
    }

    // 组装sql
    const selectClause = `SELECT * FROM auto_explain_path`
    const whereClause = `'${path}' REGEXP regular_expression`
    let statement = selectClause.concat(' WHERE ', whereClause)

    // 查询和转换
    const resultPage = lodash.cloneDeep(page)
    const sort = isNullish(page.query?.sort) ? [] : page.query.sort
    statement = await super.sortAndPage(statement, resultPage, sort)
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement)
    resultPage.data = super.toResultTypeDataList<AutoExplainPath>(rows)
    return resultPage
  }

  /**
   * 查询监听此path的自动解释列表
   * @param path
   */
  async getListenerList(path: string): Promise<AutoExplainPath[]> {
    const statement = `SELECT * FROM auto_explain_path WHERE '${path}' REGEXP regular_expression`
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement)
    return super.toResultTypeDataList<AutoExplainPath>(rows)
  }
}
