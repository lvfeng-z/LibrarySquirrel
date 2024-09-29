import InstalledPlugins from '../InstalledPlugins.ts'
import { isNullish } from '../../util/CommonUtil.ts'

export default class InstalledPluginsDTO extends InstalledPlugins {
  /**
   * 加载路径
   */
  loadPath: string | undefined | null

  constructor(installedPluginsDTO?: InstalledPluginsDTO | InstalledPlugins) {
    if (isNullish(installedPluginsDTO)) {
      super()
      this.loadPath = undefined
    } else if (installedPluginsDTO instanceof InstalledPluginsDTO) {
      super(installedPluginsDTO)
      this.loadPath = installedPluginsDTO.loadPath
    } else {
      super()
      this.loadPath = undefined
    }
  }
}
