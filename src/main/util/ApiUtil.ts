export class ApiUtil {
  success: boolean | undefined
  msg: string | undefined
  data: unknown | undefined
  constructor() {
    this.success = undefined
    this.msg = undefined
    this.data = undefined
  }

  public response(data: unknown) {
    this.success = true
    this.data = data
    return this
  }

  public setMsg(msg: string) {
    this.msg = msg
    return this
  }

  public error(msg: string) {
    this.success = false
    this.msg = msg
    return this
  }
}
