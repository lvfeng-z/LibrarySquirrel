import { ElMessage } from 'element-plus'

export function parseApiResponse(
  response: { success: boolean; msg: string; data: unknown },
  showMsg: boolean
) {
  if (response?.success) {
    return response.data
  }

  if (showMsg && (response?.msg || '未知错误')) {
    ElMessage({
      message: response?.msg ?? '未知错误',
      type: 'error'
    })
  }

  return undefined
}
