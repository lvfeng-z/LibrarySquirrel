import Electron from 'electron'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'
import { v4 } from 'uuid'
import ConfirmConfig from '../model/util/ConfirmConfig.js'

export function SendConfirmToWindow(config: ConfirmConfig): Promise<boolean> {
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
