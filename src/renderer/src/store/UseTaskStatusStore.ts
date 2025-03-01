import { defineStore } from 'pinia'
import TaskProgressMapTreeDTO from '@renderer/model/main/dto/TaskProgressMapTreeDTO.ts'

export const useTaskStatusStore = defineStore('taskStatus', {
  state: (): Map<number, TaskProgressMapTreeDTO> => {
    const r = new Map<number, TaskProgressMapTreeDTO>()
    r.set(1, new TaskProgressMapTreeDTO())
    return r
  }
})
