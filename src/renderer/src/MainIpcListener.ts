import TaskProgressDTO from '@renderer/model/main/dto/TaskProgressDTO.ts'
import { useTaskStore } from '@renderer/store/UseTaskStore.ts'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'
import TaskProgressMapTreeDTO from '@renderer/model/main/dto/TaskProgressMapTreeDTO.ts'
import { ElMessageBox } from 'element-plus'
import { useParentTaskStore } from '@renderer/store/UseParentTaskStore.ts'

export function iniListener() {
  window.electron.ipcRenderer.on('taskStatus-setTask', (_event, [taskList]: [TaskProgressDTO[]]) => {
    useTaskStore().setTask(taskList)
  })

  window.electron.ipcRenderer.on('taskStatus-updateTask', (_event, [taskList]: [TaskProgressDTO[]]) => {
    useTaskStore().updateTask(taskList)
  })

  window.electron.ipcRenderer.on('taskStatus-updateSchedule', (_event, [scheduleDTOList]: [TaskScheduleDTO[]]) => {
    useTaskStore().updateTaskSchedule(scheduleDTOList)
  })

  window.electron.ipcRenderer.on('taskStatus-removeTask', (_event, [ids]: [number[]]) => {
    useTaskStore().removeTask(ids)
  })

  window.electron.ipcRenderer.on('parentTaskStatus-setParentTask', (_event, [taskList]: [TaskProgressMapTreeDTO[]]) => {
    useParentTaskStore().setParentTask(taskList)
  })

  window.electron.ipcRenderer.on('parentTaskStatus-updateParentTask', (_event, [taskList]: [TaskProgressMapTreeDTO[]]) => {
    useParentTaskStore().updateParentTask(taskList)
  })

  window.electron.ipcRenderer.on('parentTaskStatus-updateSchedule', (_event, [taskList]: [TaskScheduleDTO[]]) => {
    useParentTaskStore().updateParentTaskSchedule(taskList)
  })

  window.electron.ipcRenderer.on('parentTaskStatus-removeParentTask', (_event, [ids]: [number[]]) => {
    useParentTaskStore().removeParentTask(ids)
  })

  window.electron.ipcRenderer.on('mainWindow-closeConfirm', () => {
    ElMessageBox.confirm('有任务正在进行中', '是否关闭LibrarySquirrel', {
      confirmButtonText: '关闭',
      cancelButtonText: '取消',
      type: 'warning'
    }).then((r) => {
      window.electron.ipcRenderer.send('mainWindow-closeConfirmed', r.action === 'confirm')
    })
  })
}
