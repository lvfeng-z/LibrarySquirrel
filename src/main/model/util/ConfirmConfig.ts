export default interface ConfirmConfig {
  title: string
  msg: string
  confirmButtonText: string
  cancelButtonText: string
  type: 'primary' | 'success' | 'warning' | 'info' | 'error'
}
