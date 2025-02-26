import { ArrayIsEmpty, IsNullish } from './CommonUtil.js'
import StringUtil from './StringUtil.js'

export function AssertTrue(value: boolean, msg?: string) {
  if (!value) {
    console.error(msg)
    throw new Error(msg)
  }
}

export function AssertFalse(value: boolean, msg?: string) {
  if (value) {
    console.error(msg)
    throw new Error(msg)
  }
}

export function AssertNotNullish<T>(value: T | null | undefined, msg?: string): asserts value {
  if (IsNullish(value)) {
    console.error(msg)
    throw new Error(msg)
  }
}

export function AssertArrayNotEmpty(value: unknown, msg?: string): asserts value {
  if (ArrayIsEmpty(value)) {
    console.error(msg)
    throw new Error(msg)
  }
}

export function AssertNotBlank(value: string | undefined | null, msg?: string): asserts value {
  if (StringUtil.isBlank(value)) {
    console.error(msg)
    throw new Error(msg)
  }
}
