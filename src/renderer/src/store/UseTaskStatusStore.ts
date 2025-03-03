import { defineStore } from 'pinia'
import TaskProgressMapTreeDTO from '@renderer/model/main/dto/TaskProgressMapTreeDTO.ts'
import { CopyIgnoreUndefined } from '@renderer/utils/ObjectUtil.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'
import lodash from 'lodash'

export const useTaskStatusStore = defineStore('taskStatus', {
  state: (): Map<number, TaskProgressMapTreeDTO> => {
    return new Map<number, TaskProgressMapTreeDTO>()
  }
})

export function setChildren(taskList: TaskProgressMapTreeDTO[]): void {
  const pidChildrenMap = lodash.groupBy(taskList, 'pid')
  const taskStatus = useTaskStatusStore()
  Object.entries(pidChildrenMap).forEach(([pid, tempTaskList]) => {
    const parent = taskStatus.get(Number(pid))
    tempTaskList.forEach((task) => {
      if (IsNullish(task.id)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，子任务的id为空')
      }
      if (IsNullish(parent)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，父任务不存在')
      }
      if (IsNullish(parent.children)) {
        parent.children = new Map<number, TaskProgressMapTreeDTO>()
      }
      parent.children.set(task.id, task)
    })
  })
}

export function updateChildren(taskList: TaskProgressMapTreeDTO[]): void {
  const pidChildrenMap = lodash.groupBy(taskList, 'pid')
  const taskStatus = useTaskStatusStore()
  Object.entries(pidChildrenMap).forEach(([pid, tempTaskList]) => {
    const parent = taskStatus.get(Number(pid))
    tempTaskList.forEach((task) => {
      if (IsNullish(task.id)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，子任务的id为空')
      }
      if (IsNullish(parent)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，父任务不存在')
      }
      if (IsNullish(parent.children)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，子任务不存在')
      }
      const oldChildren = parent.children.get(task.id)
      if (IsNullish(oldChildren)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，子任务不存在')
      }
      CopyIgnoreUndefined(oldChildren, task)
    })
  })
}

export function updateChildrenSchedule(scheduleDTOList: TaskScheduleDTO[]): void {
  const pidChildrenMap = lodash.groupBy(scheduleDTOList, 'pid')
  const taskStatus = useTaskStatusStore()
  Object.entries(pidChildrenMap).forEach(([pid, tempTaskList]) => {
    const parent = taskStatus.get(Number(pid))
    tempTaskList.forEach((task) => {
      if (IsNullish(task.id)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，子任务的id为空')
      }
      if (IsNullish(parent)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，父任务不存在')
      }
      if (IsNullish(parent.children)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，子任务不存在')
      }
      const children = parent.children.get(task.id)
      if (IsNullish(children)) {
        throw new Error('UseTaskStatusStore: 赋值子任务失败，子任务不存在')
      }
      if (NotNullish(children)) {
        children.status = task.status
        children.schedule = task.schedule
      }
    })
  })
}

// export function removeChildren(ids: number[]) {
//   const taskStatus = useTaskStatusStore()
//   if (ArrayNotEmpty(ids)) {
//     ids.forEach((id) => taskStatus.delete(id))
//   }
// }

export function setParent(taskList: TaskProgressMapTreeDTO[]): void {
  const taskStatus = useTaskStatusStore()
  taskList.forEach((task) => {
    if (IsNullish(task.id)) {
      throw new Error('UseTaskStatusStore: 赋值父任务失败，任务id为空')
    }
    taskStatus.set(task.id, task)
  })
}

export function updateParent(taskList: TaskProgressMapTreeDTO[]): void {
  const taskStatus = useTaskStatusStore()
  taskList.forEach((task) => {
    if (IsNullish(task.id)) {
      throw new Error('UseTaskStatusStore: 赋值父任务失败，任务id为空')
    }
    const oldParent = taskStatus.get(task.id)
    if (NotNullish(oldParent)) {
      CopyIgnoreUndefined(oldParent, task)
    }
  })
}

export function updateParentSchedule(scheduleDTOList: TaskScheduleDTO[]): void {
  const taskStatus = useTaskStatusStore()
  scheduleDTOList.forEach((scheduleDTO) => {
    if (IsNullish(scheduleDTO.id)) {
      throw new Error('UseTaskStatusStore: 赋值父任务失败，任务id为空')
    }
    const parent = taskStatus.get(scheduleDTO.id)
    if (NotNullish(parent)) {
      parent.status = scheduleDTO.status
      parent.schedule = scheduleDTO.schedule
      parent.total = scheduleDTO.total
      parent.finished = scheduleDTO.finished
    }
  })
}

export function removeParent(ids: number[]) {
  const taskStatus = useTaskStatusStore()
  if (ArrayNotEmpty(ids)) {
    ids.forEach((id) => taskStatus.delete(id))
  }
}
