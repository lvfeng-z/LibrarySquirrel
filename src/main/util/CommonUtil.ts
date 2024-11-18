export function notNullish<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

export function isNullish(value: unknown): value is undefined | null {
  return !notNullish(value)
}

export function arrayNotEmpty(value: unknown): value is unknown[] {
  return notNullish(value) && Array.isArray(value) && value.length > 0
}

export function arrayIsEmpty(value: unknown): value is null | undefined | [] {
  return !arrayNotEmpty(value)
}
