import { GlobalVar, GlobalVars } from './GlobalVar.js'

export enum RenderEvent {
  TASK_SET_TASK = 'task-setTask',
  TASK_UPDATE_TASK = 'task-updateTask',
  TASK_UPDATE_TASK_SCHEDULE = 'task-updateTaskSchedule',
  TASK_REMOVE_TASK = 'task-removeTask',
  PARENT_TASK_SET_PARENT_TASK = 'parentTask-setParentTask',
  PARENT_TASK_UPDATE_PARENT_TASK = 'parentTask-updateParentTask',
  PARENT_TASK_UPDATE_PARENT_TASK_SCHEDULE = 'parentTask-updateParentTaskSchedule',
  PARENT_TASK_REMOVE_PARENT_TASK = 'parentTask-removeParentTask'
}

/**
 * 向渲染进程发送消息
 * @param channel 事件通道名称
 * @param args 要发送的数据
 */
export function SendMsgToRender(channel: RenderEvent, ...args: unknown[]) {
  const mainWindow = GlobalVar.get(GlobalVars.MAIN_WINDOW)
  mainWindow.webContents.send(channel, args)
}
