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
}
