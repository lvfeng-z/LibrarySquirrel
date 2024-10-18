import SettingsService from '../service/SettingsService.js'
import pLimit from 'p-limit'
import { TaskStatesEnum } from '../constant/TaskStatesEnum.js'

export class TaskQueue {
  private queue: pLimit.Limit
  constructor() {
    // 读取设置中的最大并行数
    const settings = SettingsService.getSettings()
    const maxSaveWorksPromise =
      settings.importSettings.maxParallelImport >= 1 ? settings.importSettings.maxParallelImport : 1
    this.queue = pLimit(maxSaveWorksPromise)
  }

  // public execute(): void {}
  // public refreshLimit(): void {}
  public addTask(task: () => Promise<TaskStatesEnum>): Promise<TaskStatesEnum> {
    return this.queue(() => task())
  }
}
