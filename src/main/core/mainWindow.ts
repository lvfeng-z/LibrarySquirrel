import { isNullish } from '@shared/util/CommonUtil.ts'

let mainWindow: Electron.BrowserWindow | undefined = undefined

function setMainWindow(win: Electron.BrowserWindow) {
  if (isNullish(mainWindow)) {
    mainWindow = win
  }
}

function getMainWindow() {
  if (isNullish(mainWindow)) {
    throw new Error('主窗口未初始化')
  }
  return mainWindow
}

export { setMainWindow, getMainWindow }
