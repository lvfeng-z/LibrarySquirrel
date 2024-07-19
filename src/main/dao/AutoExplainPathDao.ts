import BaseDao from './BaseDao.ts'
import AutoExplainPathQueryDTO from '../model/queryDTO/AutoExplainPathQueryDTO.ts'
import AutoExplainPath from '../model/AutoExplainPath.ts'
import DB from '../database/DB.ts'

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
   * 查询监听此path的自动解释
   * @param path
   */
  async getListener(path: string): Promise<AutoExplainPath[]> {
    const db = this.acquire()
    try {
      const statement = `select * from auto_explain_path where '${path}' REGEXP regular_expression`
      const rows = (await db.prepare(statement)).all() as object[]
      return super.getResultTypeDataList<AutoExplainPath>(rows)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }
}
