/**
 * 基础模型
 */
export default class BaseModel {
  /**
   * 主键
   */
  id: number | string | null | undefined

  /**
   * 创建时间
   */
  createTime: string | null | undefined

  /**
   * 更新时间
   */
  updateTime: string | null | undefined

  constructor(baseModel: BaseModel) {
    this.id = baseModel.id
    this.createTime = baseModel.createTime
    this.updateTime = baseModel.updateTime
  }
}
