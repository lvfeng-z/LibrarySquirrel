import Plugin from '../entity/Plugin.ts'
import AdmZip from 'adm-zip'

export default class PluginInstallDTO extends Plugin {
  /**
   * 插件类型
   */
  type: string

  /**
   * 作者
   */
  author: string

  /**
   * 名称
   */
  name: string

  /**
   * 版本
   */
  version: string

  /**
   * 入口文件名
   */
  fileName: string

  /**
   * 安装包路径
   */
  packagePath: string

  /**
   * 安装包
   */
  package: AdmZip

  /**
   * 监听路径列表
   */
  listeners: string[]

  constructor(pluginDTO: PluginInstallDTOConstr) {
    super()
    this.type = pluginDTO.type
    this.author = pluginDTO.author
    this.name = pluginDTO.name
    this.version = pluginDTO.version
    this.fileName = pluginDTO.fileName
    this.packagePath = pluginDTO.packagePath
    this.package = pluginDTO.package
    this.listeners = pluginDTO.listeners
  }
}

interface PluginInstallDTOConstr {
  /**
   * 插件类型
   */
  type: string

  /**
   * 作者
   */
  author: string

  /**
   * 名称
   */
  name: string

  /**
   * 版本
   */
  version: string

  /**
   * 文件名
   */
  fileName: string

  /**
   * 安装包路径
   */
  packagePath: string

  /**
   * 安装包
   */
  package: AdmZip

  /**
   * 监听路径列表
   */
  listeners: string[]
}
