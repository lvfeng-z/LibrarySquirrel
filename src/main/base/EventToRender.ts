import { GVar, GVarEnum } from './GVar.js'
import LogUtil from '../util/LogUtil.js'

export enum RenderEvent {
  TASK_STATUS_SET_TASK = 'taskStatus-setTask',
  TASK_STATUS_UPDATE_TASK = 'taskStatus-updateTask',
  TASK_STATUS_UPDATE_SCHEDULE = 'taskStatus-updateSchedule',
  TASK_STATUS_REMOVE_TASK = 'taskStatus-removeTask',
  PARENT_TASK_STATUS_SET_PARENT_TASK = 'parentTaskStatus-setParentTask',
  PARENT_TASK_STATUS_UPDATE_PARENT_TASK = 'parentTaskStatus-updateParentTask',
  PARENT_TASK_STATUS_UPDATE_SCHEDULE = 'parentTaskStatus-updateSchedule',
  PARENT_TASK_STATUS_REMOVE_PARENT_TASK = 'parentTaskStatus-removeParentTask'
}

/**
 * 向渲染进程发送消息
 * @param channel 事件通道名称
 * @param args 要发送的数据
 */
export function SendMsgToRender(channel: RenderEvent, ...args: unknown[]) {
  const mainWindow = GVar.get(GVarEnum.MAIN_WINDOW)
  try {
    mainWindow.webContents.send(channel, args)
  } catch (ignoredError) {
    LogUtil.error('SendMsgToRender', ignoredError)
  }
}
