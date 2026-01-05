/**
 * 基础模型
 */
export default class BaseEntity {
  /**
   * 主键
   */
  id: Id | null | undefined

  /**
   * 创建时间
   */
  createTime: number | null | undefined

  /**
   * 更新时间
   */
  updateTime: number | null | undefined

  constructor(baseEntity?: BaseEntity) {
    if (baseEntity === undefined) {
      this.id = undefined
      this.createTime = undefined
      this.updateTime = undefined
    } else {
      this.id = baseEntity.id
      this.createTime = baseEntity.createTime
      this.updateTime = baseEntity.updateTime
    }
  }
}

export type Id = number
