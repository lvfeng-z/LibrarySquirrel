import { defineStore } from 'pinia'
import TaskProgressDTO from '@renderer/model/main/dto/TaskProgressDTO.ts'
import { CopyIgnoreUndefined } from '@renderer/utils/ObjectUtil.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'
import { useNotificationStore } from '@renderer/store/UseNotificationStore.ts'
import NotificationItem from '@renderer/model/util/NotificationItem.ts'
import { h } from 'vue'
import { TaskStatusEnum } from '@renderer/constants/TaskStatusEnum.ts'

export const useTaskStore = defineStore('task', {
  state: (): Map<number, TaskStoreObj> => {
    return new Map<number, TaskStoreObj>()
  },
  actions: {
    getTask(taskId: number): TaskProgressDTO | undefined {
      return this.$state.get(taskId)?.task
    },
    setTask(taskList: TaskProgressDTO[]): void {
      const taskStatus: Map<number, TaskStoreObj> = this.$state
      const notificationStore = useNotificationStore()
      taskList.forEach((task) => {
        // 只有进行中、等待中两种状态才推送到通知Store中
        if (TaskStatusEnum.PROCESSING === task.status || TaskStatusEnum.WAITING === task.status) {
          const tempRemovePromise: Promise<string> = new Promise((resolve) => {
            if (IsNullish(task.id)) {
              throw new Error('UseTaskStore: 赋值任务失败，任务id为空')
            }

            taskStatus.set(task.id, { task, removeResolve: resolve })
          })
          const notificationItem = new NotificationItem()
          notificationItem.title = task.taskName as string
          notificationItem.removeOnSettle = tempRemovePromise
          notificationItem.render = () => h('div', {}, () => task.finished)
          notificationStore.add(notificationItem)
        }
      })
    },
    hasTask(taskId: number): boolean {
      return this.$state.has(taskId)
    },
    updateTask(taskList: TaskProgressDTO[]): void {
      taskList.forEach((task) => {
        if (IsNullish(task.id)) {
          throw new Error('UseTaskStore: 更新任务失败，任务id为空')
        }
        const oldTask = this.$state.get(task.id)
        if (NotNullish(oldTask)) {
          // 更新状态是发现任务状态变化为完成或失败，解决通知Store中该任务的Promise
          if (task.status !== oldTask.task.status) {
            if (task.status === TaskStatusEnum.FINISHED) {
              oldTask.removeResolve(`任务${task.id}已完成`)
            } else if (task.status === TaskStatusEnum.FAILED) {
              oldTask.removeResolve(`任务${task.id}失败`)
            }
          }
          CopyIgnoreUndefined(oldTask.task, task)
        }
      })
    },
    updateTaskSchedule(scheduleDTOList: TaskScheduleDTO[]): void {
      scheduleDTOList.forEach((scheduleDTO) => {
        if (IsNullish(scheduleDTO.id)) {
          throw new Error('UseTaskStore: 更新任务进度失败，任务id为空')
        }
        const task = this.getTask(scheduleDTO.id)
        if (NotNullish(task)) {
          task.status = scheduleDTO.status
          task.total = scheduleDTO.total
          task.finished = scheduleDTO.finished
        }
      })
    },
    removeTask(ids: number[]) {
      const taskStatus = this.$state
      if (ArrayNotEmpty(ids)) {
        ids.forEach((id) => taskStatus.delete(id))
      }
    }
  }
})

export type TaskStoreObj = { task: TaskProgressDTO; removeResolve: (msg: string) => void }
