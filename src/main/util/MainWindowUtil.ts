import Electron from 'electron'
import { v4 } from 'uuid'
import NotifyConfig from '../model/util/NotifyConfig.js'
import { IsNullish } from './CommonUtil.js'
import { getMainWindow } from '../core/mainWindow.ts'

export function GetBrowserWindow(width?: number, height?: number): Electron.BrowserWindow {
  return new Electron.BrowserWindow({
    width: IsNullish(width) ? 800 : width,
    height: IsNullish(height) ? 600 : height,
    webPreferences: {
      nodeIntegration: true
    }
  })
}

export interface ConfirmConfigConstruct {
  title: string
  msg: string
  confirmButtonText: string
  cancelButtonText: string
  type: 'primary' | 'success' | 'warning' | 'info' | 'error'
}

export function SendConfirmToWindow(config: ConfirmConfigConstruct): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const confirmId = v4()
    Electron.ipcMain.on('custom-confirm-echo', (_event, receivedId: string, confirmed: boolean) => {
      if (receivedId === confirmId) {
        resolve(confirmed)
      }
    })
    getMainWindow().webContents.send('custom-confirm', confirmId, config)
  })
}

export function SendNotifyToWindow(config: NotifyConfig): void {
  getMainWindow().webContents.send('custom-notify', config)
}
