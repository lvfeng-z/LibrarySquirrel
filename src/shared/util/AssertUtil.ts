import { isBlank } from './StringUtil.ts'
import { ArrayIsEmpty, IsNullish } from './CommonUtil.ts'

/**
 * 断言为 true
 */
export function AssertTrue(value: boolean, msg?: string): void {
  if (!value) {
    throw new Error(msg)
  }
}

/**
 * 断言为 false
 */
export function AssertFalse(value: boolean, msg?: string): void {
  if (value) {
    throw new Error(msg)
  }
}

/**
 * 断言值不为 null 或 undefined
 */
export function AssertNotNullish<T>(value: T | null | undefined, _caller?: string, msg?: string): asserts value {
  if (IsNullish(value)) {
    throw new Error(msg)
  }
}

/**
 * 断言数组不为空
 */
export function AssertArrayNotEmpty(value: unknown, msg?: string): asserts value {
  if (ArrayIsEmpty(value)) {
    throw new Error(msg)
  }
}

/**
 * 断言字符串不为空白
 */
export function AssertNotBlank(value: string | undefined | null, msg?: string): asserts value {
  if (isBlank(value)) {
    throw new Error(msg)
  }
}
