import { Readable } from 'node:stream'
import { isNullish } from '../../util/CommonUtil.ts'

/**
 * 插件的resume函数响应值类型
 */
export default class PluginResumeResponse {
  /**
   * 提供的流是否可接续在已下载部分的末尾
   */
  continuable: boolean

  /**
   * 用于继续下载的读取流
   */
  remoteStream: Readable | undefined | null

  /**
   * 资源大小，单位：字节（Bytes）
   */
  resourceSize: number

  constructor(pluginResumeResponse: PluginResumeResponse) {
    if (isNullish(pluginResumeResponse)) {
      this.continuable = false
      this.remoteStream = undefined
      this.resourceSize = 0
    } else {
      this.continuable = pluginResumeResponse.continuable
      this.remoteStream = pluginResumeResponse.remoteStream
      this.resourceSize = pluginResumeResponse.resourceSize
    }
  }
}
