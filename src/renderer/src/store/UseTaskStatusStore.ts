import { defineStore } from 'pinia'
import { ITaskStatus } from '@renderer/model/main/interface/TaskStatus.ts'
import TaskProcessingDTO from '@renderer/model/main/dto/TaskProcessingDTO.ts'

export const useTaskStatusStore = defineStore('taskStatus', {
  state: (): Map<number, ITaskStatus> => {
    const r = new Map<number, ITaskStatus>()
    r.set(1, new TaskProcessingDTO())
    return r
  }
})
