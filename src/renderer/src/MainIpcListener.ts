import TaskProgressDTO from '@renderer/model/main/dto/TaskProgressDTO.ts'
import { useTaskStore } from '@renderer/store/UseTaskStore.ts'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'
import TaskProgressMapTreeDTO from '@renderer/model/main/dto/TaskProgressMapTreeDTO.ts'
import { ElMessageBox } from 'element-plus'
import { useParentTaskStore } from '@renderer/store/UseParentTaskStore.ts'
import ConfirmConfig from '@renderer/model/util/ConfirmConfig.ts'
import GotoPageConfig from '@renderer/model/util/GotoPageConfig.ts'
import { PageEnum } from '@renderer/constants/Subpage.ts'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore.ts'

export function iniListener() {
  // 任务队列
  window.electron.ipcRenderer.on('taskStatus-setTask', (_event, [taskList]: [TaskProgressDTO[]]) => useTaskStore().setTask(taskList))

  window.electron.ipcRenderer.on('taskStatus-updateTask', (_event, [taskList]: [TaskProgressDTO[]]) =>
    useTaskStore().updateTask(taskList)
  )

  window.electron.ipcRenderer.on('taskStatus-updateSchedule', (_event, [scheduleDTOList]: [TaskScheduleDTO[]]) =>
    useTaskStore().updateTaskSchedule(scheduleDTOList)
  )

  window.electron.ipcRenderer.on('taskStatus-removeTask', (_event, [ids]: [number[]]) => useTaskStore().removeTask(ids))

  window.electron.ipcRenderer.on('parentTaskStatus-setParentTask', (_event, [taskList]: [TaskProgressMapTreeDTO[]]) =>
    useParentTaskStore().setParentTask(taskList)
  )

  window.electron.ipcRenderer.on('parentTaskStatus-updateParentTask', (_event, [taskList]: [TaskProgressMapTreeDTO[]]) =>
    useParentTaskStore().updateParentTask(taskList)
  )

  window.electron.ipcRenderer.on('parentTaskStatus-updateSchedule', (_event, [taskList]: [TaskScheduleDTO[]]) =>
    useParentTaskStore().updateParentTaskSchedule(taskList)
  )

  window.electron.ipcRenderer.on('parentTaskStatus-removeParentTask', (_event, [ids]: [number[]]) =>
    useParentTaskStore().removeParentTask(ids)
  )

  // 自定义确认弹窗
  window.electron.ipcRenderer.on('custom-confirm', (_event: Electron.IpcRendererEvent, confirmId: string, config: ConfirmConfig) => {
    ElMessageBox.confirm(config.title, config.msg, {
      confirmButtonText: config.confirmButtonText,
      cancelButtonText: config.cancelButtonText,
      type: config.type
    })
      .then(() => window.electron.ipcRenderer.send('custom-confirm-echo', confirmId, true))
      .catch(() => window.electron.ipcRenderer.send('custom-confirm-echo', confirmId, false))
  })

  // 页面跳转
  const pageStatesStore = usePageStatesStore()
  window.electron.ipcRenderer.on('goto-page', (_event, config: GotoPageConfig) => {
    ElMessageBox.alert(config.content, config.title, config.options).then(() => {
      switch (config.page) {
        case PageEnum.Settings:
          pageStatesStore.showPage(pageStatesStore.pageStates.settings)
          break
        case PageEnum.SiteManage:
          // subpageProps.value.siteManageFocusOnSiteDomainId = config.extraData as string[]
          pageStatesStore.showPage(pageStatesStore.pageStates.siteManage)
          break
      }
    })
  })
}
