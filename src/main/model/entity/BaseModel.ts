/**
 * 基础模型
 */
export default class BaseModel {
  /**
   * 主键
   */
  id: Id

  /**
   * 创建时间
   */
  createTime: number | null | undefined

  /**
   * 更新时间
   */
  updateTime: number | null | undefined

  /**
   * 主键名称
   */
  public static readonly PK = 'id'

  constructor(baseModel?: BaseModel) {
    if (baseModel === undefined) {
      this.id = undefined
      this.createTime = undefined
      this.updateTime = undefined
    } else {
      this.id = baseModel.id
      this.createTime = baseModel.createTime
      this.updateTime = baseModel.updateTime
    }
  }
}

export type Id = number | null | undefined
