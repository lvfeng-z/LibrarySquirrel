export class ApiUtil {
  success: boolean | undefined
  msg: string | undefined
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
      return this.response(undefined).setMsg('操作成功')
    } else {
      return this.error('主进程错误')
    }
  }
}
