import { defineStore } from 'pinia'
import TaskProgressDTO from '@renderer/model/main/dto/TaskProgressDTO.ts'
import { CopyIgnoreUndefined } from '@renderer/utils/ObjectUtil.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'

export const useParentTaskStore = defineStore('parentTask', {
  state: (): Map<number, TaskProgressDTO> => {
    return new Map<number, TaskProgressDTO>()
  }
})

export function setParentTask(taskList: TaskProgressDTO[]): void {
  const taskStatus = useParentTaskStore().$state
  taskList.forEach((task) => {
    if (IsNullish(task.id)) {
      throw new Error('UseTaskStatusStore: 赋值父任务失败，任务id为空')
    }
    taskStatus.set(task.id, task)
  })
}

export function updateParentTask(taskList: TaskProgressDTO[]): void {
  const taskStatus = useParentTaskStore().$state
  taskList.forEach((task) => {
    if (IsNullish(task.id)) {
      throw new Error('UseTaskStatusStore: 赋值父任务失败，任务id为空')
    }
    const oldTask = taskStatus.get(task.id)
    if (NotNullish(oldTask)) {
      CopyIgnoreUndefined(oldTask, task)
    }
  })
}

export function updateParentTaskSchedule(scheduleDTOList: TaskScheduleDTO[]): void {
  const taskStatus = useParentTaskStore().$state
  scheduleDTOList.forEach((scheduleDTO) => {
    if (IsNullish(scheduleDTO.id)) {
      throw new Error('UseTaskStatusStore: 赋值父任务失败，任务id为空')
    }
    const task = taskStatus.get(scheduleDTO.id)
    if (NotNullish(task)) {
      task.status = scheduleDTO.status
      task.schedule = scheduleDTO.schedule
      task.total = scheduleDTO.total
      task.finished = scheduleDTO.finished
    }
  })
}

export function removeParentTask(ids: number[]) {
  const taskStatus = useParentTaskStore().$state
  if (ArrayNotEmpty(ids)) {
    ids.forEach((id) => taskStatus.delete(id))
  }
}
