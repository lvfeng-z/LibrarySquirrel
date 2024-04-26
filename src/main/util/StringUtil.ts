function isBlank(input: string) {
  return !input || /^\s*$/.test(input)
}

function isNotBlank(input: string) {
  return !isBlank(input)
}

function camelToSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

function snakeToCamelCase(str: string): string {
  return str.replace(/(_\w)/g, (m) => m[1].toUpperCase())
}
export default {
  isBlank,
  isNotBlank,
  camelToSnakeCase,
  snakeToCamelCase
}
