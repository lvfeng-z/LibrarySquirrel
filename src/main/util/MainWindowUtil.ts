import Electron from 'electron'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'
import { v4 } from 'uuid'

export function SendConfirmToWindow(config: ConfirmConfigConstruct): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const confirmId = v4()
    Electron.ipcMain.on('custom-confirm-echo', (_event, receivedId: string, confirmed: boolean) => {
      if (receivedId === confirmId) {
        resolve(confirmed)
      }
    })
    GlobalVar.get(GlobalVars.MAIN_WINDOW).webContents.send('custom-confirm', confirmId, config)
  })
}

export interface ConfirmConfigConstruct {
  title: string
  msg: string
  confirmButtonText: string
  cancelButtonText: string
  type: 'primary' | 'success' | 'warning' | 'info' | 'error'
}
