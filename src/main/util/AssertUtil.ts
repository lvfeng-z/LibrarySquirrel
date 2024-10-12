import LogUtil from './LogUtil.js'
import { isNullish } from './CommonUtil.js'

export function assertTrue(isTrue: boolean, msg: string) {
  if (!isTrue) {
    LogUtil.error(msg)
    throw new Error(msg)
  }
}

export function assertNotNullish<T>(
  value: T | null | undefined,
  caller?: string,
  msg?: string
): asserts value {
  if (isNullish(value)) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}
