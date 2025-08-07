import Electron from 'electron'
import { ExternalAppEnum } from '../constant/ExternalAppEnum.js'
import { GVar, GVarEnum } from '../base/GVar.js'
import path from 'path'

export default class AppLauncherService {
  public openImage(url: string): void {
    const settings = GVar.get(GVarEnum.SETTINGS)
    this.microsoftPhotos()(path.join(settings.store.workdir, url))
  }

  public getLauncher<T extends ExternalAppEnum>(app: T): ExternalAppMapping[T] {
    switch (app) {
      case ExternalAppEnum.MICROSOFT_PHOTOS:
        return this.microsoftPhotos() as ExternalAppMapping[T]
      case ExternalAppEnum.MICROSOFT_MOVIES_TV:
        return this.microsoftMoviesTv() as ExternalAppMapping[T]
      case ExternalAppEnum.POT_PLAYER:
        return this.potPlayer() as ExternalAppMapping[T]
      default:
        throw new Error()
    }
  }

  private microsoftPhotos() {
    return (imagePath: string) => {
      Electron.shell.openPath(imagePath).catch((err) => {
        console.error('打开图片失败:', err)
      })
    }
  }

  private microsoftMoviesTv() {
    return () => {}
  }

  private potPlayer() {
    return () => {}
  }
}

// 映射类型
type ExternalAppMapping = {
  [ExternalAppEnum.MICROSOFT_PHOTOS]: { id: string }
  [ExternalAppEnum.MICROSOFT_MOVIES_TV]: () => void
  [ExternalAppEnum.POT_PLAYER]: () => void
}
