import Plugin from '../entity/Plugin.ts'
import StringUtil from '../../util/StringUtil.js'

export default class PluginInstallDTO extends Plugin {
  /**
   * 安装包路径
   */
  packagePath: string

  constructor(pluginDTO?: PluginInstallDTO | Plugin, packagePath?: string) {
    super(pluginDTO)
    if (StringUtil.isBlank(packagePath) && StringUtil.isBlank(pluginDTO?.['packagePath'])) {
      throw new Error('Invalid package path')
    } else {
      this.packagePath = StringUtil.isBlank(packagePath) ? packagePath : pluginDTO?.['packagePath']
    }
  }
}
