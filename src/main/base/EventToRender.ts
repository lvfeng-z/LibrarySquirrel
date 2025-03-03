import { GlobalVar, GlobalVars } from './GlobalVar.js'

export enum RenderEvent {
  TASK_LIST_SET_CHILDREN = 'taskList-setChildren',
  TASK_LIST_UPDATE_CHILDREN = 'taskList-updateChildren',
  TASK_LIST_UPDATE_CHILDREN_SCHEDULE = 'taskList-updateChildrenSchedule',
  TASK_LIST_SET_PARENT = 'taskList-setParent',
  TASK_LIST_UPDATE_PARENT = 'taskList-updateParent',
  TASK_LIST_UPDATE_PARENT_SCHEDULE = 'taskList-updateParentSchedule',
  TASK_LIST_REMOVE_PARENT = 'taskList-removeParent'
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
