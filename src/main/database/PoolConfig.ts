import { ConnectionPoolConfig } from './ConnectionPool.js'
import { DataBasePath } from '../util/DatabaseUtil.js'
import DataBaseConstant from '../constant/DataBaseConstant.js'

export const PoolConfig: ConnectionPoolConfig = {
  maxRead: 10, // 最大连接数
  maxWrite: 10, // 最大连接数
  idleTimeout: 30000, // 连接空闲超时时间（毫秒）
  databasePath: DataBasePath() + DataBaseConstant.DB_FILE_NAME // 数据库文件路径
}
