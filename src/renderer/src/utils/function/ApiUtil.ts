import { ElMessage } from 'element-plus'
import { ApiResponse } from '../model/ApiResponse'

export function apiResponseCheck(response: ApiResponse): boolean {
  if (response) {
    return !!response?.success
  } else {
    return false
  }
}

export function apiResponseGetData(response: ApiResponse): unknown | undefined {
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

export function apiResponseMsg(response: ApiResponse): void {
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

export function apiResponseMsgNoSuccess(response: ApiResponse): void {
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
