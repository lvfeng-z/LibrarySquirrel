import { Readable } from 'node:stream'
import { isNullish } from '../../util/CommonUtil.ts'

/**
 * 插件的resume函数响应值类型
 */
export default class PluginResumeResponse {
  /**
   * 提供的流是否可接续在已下载部分的末尾
   */
  continuable: boolean | undefined | null

  /**
   * 用于继续下载的读取流
   */
  remoteStream: Readable | undefined | null

  constructor(pluginResumeResponse: PluginResumeResponse) {
    if (isNullish(pluginResumeResponse)) {
      this.continuable = undefined
      this.remoteStream = undefined
    } else {
      this.continuable = pluginResumeResponse.continuable
      this.remoteStream = pluginResumeResponse.remoteStream
    }
  }
}
