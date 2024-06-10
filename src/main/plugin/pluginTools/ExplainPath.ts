import Electron from 'electron'
import MeaningOfPath from '../../model/utilModels/MeaningOfPath.ts'

export default class ExplainPath {
  private mainWindow: Electron.BrowserWindow

  constructor(mainWindow: Electron.BrowserWindow) {
    this.mainWindow = mainWindow
  }

  async getExplain(dir: string): Promise<MeaningOfPath> {
    return new Promise((resolve) => {
      const meaningOfPath = new MeaningOfPath()
      Electron.ipcMain.once('explain-path-response', (_event, args) => {
        meaningOfPath.name = args
        resolve(meaningOfPath)
      })
      this.mainWindow.webContents.send('explain-path-request', dir)
    })
  }
}
