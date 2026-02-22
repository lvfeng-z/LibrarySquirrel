/**
 * 判断值是否不为 null 或 undefined
 */
export function NotNullish<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

/**
 * 判断值是否为 null 或 undefined
 */
export function IsNullish(value: unknown): value is undefined | null {
  return !NotNullish(value)
}

/**
 * 判断数组是否不为空
 */
export function ArrayNotEmpty(value: unknown): value is unknown[] {
  return NotNullish(value) && Array.isArray(value) && value.length > 0
}

/**
 * 判断数组是否为空
 */
export function ArrayIsEmpty(value: unknown): value is null | undefined | [] {
  return !ArrayNotEmpty(value)
}
