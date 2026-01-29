import { IsNullish } from '../util/CommonUtil.ts'

let mainWindow: Electron.BrowserWindow | undefined = undefined

function setMainWindow(win: Electron.BrowserWindow) {
  if (IsNullish(mainWindow)) {
    mainWindow = win
  }
}

function getMainWindow() {
  if (IsNullish(mainWindow)) {
    throw new Error('主窗口未初始化')
  }
  return mainWindow
}

export { setMainWindow, getMainWindow }
