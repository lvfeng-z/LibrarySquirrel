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
  state: (): { tasks: Map<number, TaskStoreObj> } => {
    return { tasks: new Map<number, TaskStoreObj>() }
  },
  actions: {
    getTask(taskId: number): TaskProgressDTO | undefined {
      return this.tasks.get(taskId)?.task
    },
    setTask(taskList: TaskProgressDTO[]): void {
      const taskStatus: Map<number, TaskStoreObj> = this.tasks
      taskList.forEach((task) => {
        let notificationId: string | undefined
        // 只有进行中、等待中两种状态才推送到通知Store中
        if (TaskStatusEnum.PROCESSING === task.status || TaskStatusEnum.WAITING === task.status) {
          const notificationItem = createNotificationItem(task)
          notificationId = useNotificationStore().add(notificationItem)
        }
        if (IsNullish(task.id)) {
          throw new Error('UseTaskStore: 赋值任务失败，任务id为空')
        }
        taskStatus.set(task.id, { task, notificationId })
      })
    },
    hasTask(taskId: number): boolean {
      return this.tasks.has(taskId)
    },
    updateTask(taskList: TaskProgressDTO[]): void {
      taskList.forEach((task) => {
        if (IsNullish(task.id)) {
          throw new Error('UseTaskStore: 更新任务失败，任务id为空')
        }
        const taskStoreObj = this.tasks.get(task.id)
        if (NotNullish(taskStoreObj)) {
          if (task.status !== taskStoreObj.task.status) {
            // 任务状态变化为完成或失败，解决通知Store中该任务的Promise
            if (NotNullish(taskStoreObj.notificationId)) {
              if (task.status === TaskStatusEnum.FINISHED) {
                useNotificationStore().remove(taskStoreObj.notificationId, {
                  type: 'success',
                  msg: `从${taskStoreObj.task.siteName}下载【${taskStoreObj.task.taskName}】完成`
                })
              } else if (task.status === TaskStatusEnum.FAILED) {
                useNotificationStore().remove(taskStoreObj.notificationId, {
                  type: 'error',
                  msg: `从${taskStoreObj.task.siteName}下载【${taskStoreObj.task.id}】失败`
                })
              }
            }
            // 如果状态为进行中、等待中，就推送到通知Store中
            if (
              IsNullish(taskStoreObj.notificationId) &&
              (TaskStatusEnum.PROCESSING === task.status || TaskStatusEnum.WAITING === task.status)
            ) {
              const notificationItem = createNotificationItem(taskStoreObj.task)
              taskStoreObj.notificationId = useNotificationStore().add(notificationItem)
            }
          }
          CopyIgnoreUndefined(taskStoreObj.task, task)
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
      const taskStatus = this.tasks
      if (ArrayNotEmpty(ids)) {
        ids.forEach((id) => taskStatus.delete(id))
      }
    }
  }
})

export type TaskStoreObj = {
  /**
   * 任务进度DTO
   */
  task: TaskProgressDTO
  /**
   * 通知id
   */
  notificationId: string | undefined
}

function createNotificationItem(task: TaskProgressDTO): NotificationItem {
  const notificationItem = new NotificationItem()
  notificationItem.title = `任务【${task.taskName}】`
  notificationItem.render = () => h('div', {}, '下载中')
  return notificationItem
}
