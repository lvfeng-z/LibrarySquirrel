import WorksFullDTO from './WorksFullDTO.js'

/**
 * 用于保存作品信息的DTO
 */
export default class WorksSaveDTO extends WorksFullDTO {
  /**
   * 任务id
   */
  taskId: number

  constructor(taskId: number, worksDTO?: WorksFullDTO) {
    super(worksDTO)
    this.taskId = taskId
  }
}
