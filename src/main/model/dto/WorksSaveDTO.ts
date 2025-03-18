import WorksDTO from './WorksDTO.js'

/**
 * 用于保存作品信息的DTO
 */
export default class WorksSaveDTO extends WorksDTO {
  taskId: number

  constructor(taskId: number, worksDTO?: WorksDTO) {
    super(worksDTO)
    this.taskId = taskId
  }
}
