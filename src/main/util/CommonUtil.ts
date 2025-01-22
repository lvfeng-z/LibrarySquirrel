export function NotNullish<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

export function IsNullish(value: unknown): value is undefined | null {
  return !NotNullish(value)
}

export function ArrayNotEmpty(value: unknown): value is unknown[] {
  return NotNullish(value) && Array.isArray(value) && value.length > 0
}

export function ArrayIsEmpty(value: unknown): value is null | undefined | [] {
  return !ArrayNotEmpty(value)
}
