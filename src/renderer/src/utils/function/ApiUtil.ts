import { ElMessage } from 'element-plus'

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
