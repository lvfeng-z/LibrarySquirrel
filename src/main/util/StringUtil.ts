function isBlank(input: string | null | undefined): boolean {
  if (input === undefined || input === null) {
    return true
  }
  return !input || /^\s*$/.test(input)
}

function isNotBlank(input: string | null | undefined) {
  return !isBlank(input)
}

function camelToSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

function snakeToCamelCase(str: string): string {
  return str.replace(/(_\w)/g, (m) => m[1].toUpperCase())
}

function removePrefixIfPresent(str: string, target: string): string {
  // 使用 trim() 方法去除字符串开头的空白字符
  const trimmedStr = str.trim()

  // 检查处理后的字符串是否以前五个字符为"from "
  if (trimmedStr.startsWith(target)) {
    // 如果是，计算target的长度，并使用slice从target之后的字符开始截取
    return trimmedStr.slice(target.length)
  } else {
    // 否则，返回原字符串
    return str
  }
}

export default {
  isBlank,
  isNotBlank,
  camelToSnakeCase,
  snakeToCamelCase,
  removePrefixIfPresent
}
