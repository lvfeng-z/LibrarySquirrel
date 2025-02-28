import Task from '@renderer/model/main/entity/Task.ts'

export interface ITaskStatus {
  /**
   * 主键
   */
  id: number | undefined | null

  /**
   * 是否是父任务
   */
  isCollection: boolean | undefined | null

  /**
   * 上级任务id
   */
  pid: number | undefined | null

  /**
   * 任务名称
   */
  taskName: string | undefined | null

  /**
   * 任务的站点id
   */
  siteId: number | undefined | null

  /**
   * 本地作品id/本地作品集id
   */
  localWorksId: number | undefined | null

  /**
   * 站点作品id
   */
  siteWorksId: string | undefined | null

  /**
   * 当任务是父任务时，url存储创建此父任务所使用的url，否则存储的是下载资源的链接（由于存在临时的下载链接，此字段可能没有作用）
   */
  url: string | undefined | null

  /**
   * 状态（0：未开始，1：进行中，2：暂停，3：已完成，4：失败）
   */
  status: number | undefined | null

  /**
   * 下载中的文件路径
   */
  pendingDownloadPath: string | undefined | null

  /**
   * 资源是否支持续传
   */
  continuable: boolean | undefined | null

  /**
   * 插件作者
   */
  pluginAuthor: string | undefined | null

  /**
   * 插件名称
   */
  pluginName: string | undefined | null

  /**
   * 插件版本
   */
  pluginVersion: string | undefined | null

  /**
   * 插件数据
   */
  pluginData: { [key: string]: unknown } | string | undefined | null

  /**
   * 错误信息
   */
  errorMessage: string | undefined | null

  /**
   * 创建时间
   */
  createTime: number | null | undefined

  /**
   * 更新时间
   */
  updateTime: number | null | undefined

  /**
   * 子任务（用于el-table的树形数据回显）
   */
  children: Task[] | undefined | null

  /**
   * 是否有子任务（用于el-table的树形数据回显）
   */
  hasChildren: boolean | undefined | null

  /**
   * 是否为叶子节点
   */
  isLeaf: boolean | undefined | null

  /**
   * 进度
   */
  schedule: number | undefined | null

  /**
   * 总量
   */
  total: number | undefined | null

  /**
   * 已完成的量
   */
  finished: number | undefined | null

  /**
   * 站点名称
   */
  siteName: string | undefined | null
}
