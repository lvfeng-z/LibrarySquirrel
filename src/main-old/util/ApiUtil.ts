import { isBlank } from '@shared/util/StringUtil.ts'

export interface ApiResponse {
  success: boolean
  msg: string
  data?: unknown
}

export class ApiUtil implements ApiResponse {
  /**
   * 是否成功
   */
  success: boolean

  /**
   * 响应信息
   */
  msg: string

  /**
   * 数据
   */
  data: unknown | undefined

  constructor() {
    this.success = false
    this.msg = ''
    this.data = undefined
  }

  public static response(data?: unknown, msg?: string): ApiResponse {
    // 返回纯对象以确保Electron IPC可克隆，但类型断言为ApiUtil
    return {
      success: true,
      msg: isBlank(msg) ? '操作成功' : msg,
      data
    }
  }

  public static error(msg: string): ApiResponse {
    // 返回纯对象以确保Electron IPC可克隆，但类型断言为ApiUtil
    return {
      success: false,
      msg,
      data: undefined
    }
  }

  public static check(state: boolean): ApiResponse {
    if (state) {
      return this.response(undefined)
    } else {
      return this.error('主进程错误')
    }
  }
}
