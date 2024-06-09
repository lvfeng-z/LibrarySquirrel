import Electron from 'electron'
import MeaningOfPath from '../../model/utilModels/MeaningOfPath.ts'

export default class ExplainPath {
  private mainWindow: Electron.BrowserWindow

  constructor(mainWindow: Electron.BrowserWindow) {
    this.mainWindow = mainWindow
  }

  async getExplain(): Promise<MeaningOfPath> {
    const m = new MeaningOfPath()
    this.mainWindow.webContents.send('explain-path', 'fasdfadsf')
    return m
  }
}
