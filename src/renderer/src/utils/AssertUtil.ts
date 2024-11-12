import { arrayIsEmpty, isNullish } from '@renderer/utils/CommonUtil.ts'

export function assertTrue(isTrue: boolean, msg: string) {
  if (!isTrue) {
    console.error(msg)
    throw new Error(msg)
  }
}

export function assertNotNullish<T>(value: T | null | undefined, msg?: string): asserts value {
  if (isNullish(value)) {
    console.error(msg)
    throw new Error(msg)
  }
}

export function assertArrayNotEmpty(value: unknown, msg?: string): asserts value {
  if (arrayIsEmpty(value)) {
    console.error(msg)
    throw new Error(msg)
  }
}
