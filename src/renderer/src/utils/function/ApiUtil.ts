import { ElMessage } from 'element-plus'

export function apiResponseCheck(response: {
  success: boolean
  msg: string
  data: unknown
}): boolean {
  if (response) {
    return !!response?.success
  } else {
    return false
  }
}

export function apiResponseGetData(response: {
  success: boolean
  msg: string
  data: unknown
}): unknown | undefined {
  if (response) {
    if (response?.data) {
      return response.data
    } else {
      return undefined
    }
  } else {
    return undefined
  }
}

export function apiResponseMsg(response: { success: boolean; msg: string; data: unknown }): void {
  if (response?.success) {
    if (response?.msg) {
      ElMessage({
        message: response?.msg ?? null,
        type: 'success',
        icon: 'SuccessFilled'
      })
    }
  } else {
    if (response?.msg) {
      ElMessage({
        message: response?.msg ?? '未知错误',
        type: 'error'
      })
    }
  }
}

export function apiResponseMsgNoSuccess(response: {
  success: boolean
  msg: string
  data: unknown
}): void {
  if (response?.success) {
    if (response?.msg) {
      ElMessage({
        type: 'success',
        duration: 1000
      })
    }
  } else {
    if (response?.msg) {
      ElMessage({
        message: response?.msg ?? '未知错误',
        type: 'error'
      })
    }
  }
}
