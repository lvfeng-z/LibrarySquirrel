import { ArrayIsEmpty, IsNullish } from '@renderer/utils/CommonUtil.ts'

export function AssertTrue(isTrue: boolean, msg: string) {
  if (!isTrue) {
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
