import { defineStore } from 'pinia'
import TaskProgressDTO from '@renderer/model/main/dto/TaskProgressDTO.ts'
import { CopyIgnoreUndefined } from '@renderer/utils/ObjectUtil.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'
import { useBackgroundItemStore } from '@renderer/store/UseBackgroundItemStore.ts'
import BackgroundItem from '@renderer/model/util/BackgroundItem.ts'
import { h } from 'vue'

export const useTaskStore = defineStore('task', {
  state: (): Map<number, TaskProgressDTO> => {
    return new Map<number, TaskProgressDTO>()
  }
})

export function setTask(taskList: TaskProgressDTO[]): void {
  const taskStatus = useTaskStore().$state
  const backgroundItemStore = useBackgroundItemStore()
  taskList.forEach((task) => {
    if (IsNullish(task.id)) {
      throw new Error('UseTaskStatusStore: 赋值任务失败，任务id为空')
    }
    taskStatus.set(task.id, task)

    const backgroundItem = new BackgroundItem()
    backgroundItem.title = task.taskName as string
    backgroundItem.render = () => h('div', {}, () => task.finished)
    backgroundItemStore.add(backgroundItem)
  })
}

export function updateTask(taskList: TaskProgressDTO[]): void {
  const taskStatus = useTaskStore().$state
  taskList.forEach((task) => {
    if (IsNullish(task.id)) {
      throw new Error('UseTaskStatusStore: 更新任务失败，任务id为空')
    }
    const oldTask = taskStatus.get(task.id)
    if (NotNullish(oldTask)) {
      CopyIgnoreUndefined(oldTask, task)
    }
  })
}

export function updateTaskSchedule(scheduleDTOList: TaskScheduleDTO[]): void {
  const taskStatus = useTaskStore().$state
  scheduleDTOList.forEach((scheduleDTO) => {
    if (IsNullish(scheduleDTO.id)) {
      throw new Error('UseTaskStatusStore: 更新任务进度失败，任务id为空')
    }
    const task = taskStatus.get(scheduleDTO.id)
    if (NotNullish(task)) {
      task.status = scheduleDTO.status
      task.total = scheduleDTO.total
      task.finished = scheduleDTO.finished
    }
  })
}

export function removeTask(ids: number[]) {
  const taskStatus = useTaskStore().$state
  if (ArrayNotEmpty(ids)) {
    ids.forEach((id) => taskStatus.delete(id))
  }
}
