import LogUtil from './LogUtil.js'
import { arrayIsEmpty, isNullish } from './CommonUtil.js'

export function assertTrue(value: boolean, caller?: string, msg?: string) {
  if (!value) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}

export function assertFalse(value: boolean, caller?: string, msg?: string) {
  if (value) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}

export function assertNotNullish<T>(value: T | null | undefined, caller?: string, msg?: string): asserts value {
  if (isNullish(value)) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}

export function assertArrayNotEmpty(value: unknown, caller?: string, msg?: string): asserts value {
  if (arrayIsEmpty(value)) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}
