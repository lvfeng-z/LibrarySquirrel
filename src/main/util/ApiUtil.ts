import StringUtil from './StringUtil.js'

export interface ApiResponse {
  success: boolean
  msg: string
  data?: unknown
}

export default class ApiUtil implements ApiResponse {
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

  public static response(data?: unknown, msg?: string): ApiUtil {
    // 返回纯对象以确保Electron IPC可克隆，但类型断言为ApiUtil
    return {
      success: true,
      msg: StringUtil.isBlank(msg) ? '操作成功' : msg,
      data
    } as ApiUtil
  }

  // setMsg方法已移除，因为Electron IPC无法克隆函数

  public static error(msg: string): ApiUtil {
    // 返回纯对象以确保Electron IPC可克隆，但类型断言为ApiUtil
    return {
      success: false,
      msg,
      data: undefined
    } as ApiUtil
  }

  public static check(state: boolean): ApiUtil {
    if (state) {
      return this.response(undefined)
    } else {
      return this.error('主进程错误')
    }
  }
}
