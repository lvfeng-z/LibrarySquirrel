import { ElMessage } from 'element-plus'
import { ApiResponse } from '../model/util/ApiResponse'

export function apiResponseCheck(response: ApiResponse | undefined): boolean {
  if (response) {
    return !!response?.success
  } else {
    return false
  }
}

export function apiResponseGetData(response: ApiResponse | undefined): unknown | undefined {
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

export function apiResponseMsg(response: ApiResponse | undefined): void {
  if (response === undefined) {
    ElMessage({
      message: '无响应',
      type: 'warning'
    })
    return
  }

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

export function apiResponseMsgNoSuccess(response: ApiResponse | undefined): void {
  if (response === undefined) {
    ElMessage({
      message: '无响应',
      type: 'warning'
    })
    return
  }

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
