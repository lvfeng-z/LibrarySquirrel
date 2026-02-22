import LogUtil from './LogUtil.js'
import { isBlank } from '../../shared/util/StringUtil.ts'
import { ArrayIsEmpty, IsNullish } from '../../shared/util/CommonUtil.ts'

export function AssertTrue(value: boolean, caller?: string, msg?: string) {
  if (!value) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}

export function AssertFalse(value: boolean, caller?: string, msg?: string) {
  if (value) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}

export function AssertNotNullish<T>(value: T | null | undefined, caller?: string, msg?: string): asserts value {
  if (IsNullish(value)) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}

export function AssertArrayNotEmpty(value: unknown, caller?: string, msg?: string): asserts value {
  if (ArrayIsEmpty(value)) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}

export function AssertNotBlank(value: string | undefined | null, caller?: string, msg?: string): asserts value {
  if (isBlank(value)) {
    LogUtil.error(caller as string, msg)
    throw new Error(msg)
  }
}
