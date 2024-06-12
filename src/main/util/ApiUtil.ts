export default class ApiUtil {
  /**
   * 是否成功
   */
  success: boolean | undefined

  /**
   * 响应信息
   */
  msg: string | undefined

  /**
   * 数据
   */
  data: unknown | undefined

  constructor() {
    this.success = undefined
    this.msg = undefined
    this.data = undefined
  }

  public static response(data: unknown) {
    const response = new ApiUtil()
    response.success = true
    response.msg = '操作成功'
    response.data = data
    return response
  }

  public setMsg(msg: string) {
    this.msg = msg
    return this
  }

  public static error(msg: string) {
    const response = new ApiUtil()
    response.success = false
    response.msg = msg
    return response
  }

  public static check(state: boolean) {
    if (state) {
      return this.response(undefined)
    } else {
      return this.error('主进程错误')
    }
  }
}
