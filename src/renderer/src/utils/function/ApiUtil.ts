import { ElMessage } from 'element-plus'

export function apiResponseNotice(response: { success: boolean; msg: string; data: unknown }): void {
  if (response?.success) {
    if(response?.msg) {
      ElMessage({
        message: response?.msg ?? '操作成功',
        type: 'success'
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
