export function notNullish<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

export function isNullish(value: unknown): value is undefined | null {
  return !notNullish(value)
}
