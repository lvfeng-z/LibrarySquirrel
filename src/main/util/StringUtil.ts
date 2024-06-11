import LogUtil from './LogUtil.ts'

function isBlank(input: string | number | null | undefined): boolean {
  if (input === undefined || input === null) {
    return true
  }
  if (typeof input === 'number') {
    return /^\s*$/.test(String(input))
  }
  return /^\s*$/.test(input)
}

function isNotBlank(input: string | number | null | undefined) {
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

/**
 * 给定一个正则表达式，它包含一个或多个捕获组；一段文本字符串，需要从中查找与正则表达式匹配的部分；以及一个属性名数组，用于标记捕获组数据的属性。执行以下步骤：
 * 1. 使用正则表达式在文本字符串中查找所有匹配项。
 * 2. 对于每个匹配项，将其捕获组的内容提取出来。
 * 3. 将每个捕获组的内容与属性数组中的相应元素配对。第一个捕获组的内容对应属性数组的第一个元素，第二个捕获组对应第二个元素，依此类推。
 * 4. 为每个匹配创建一个对象，其中键是从属性数组中取的，值则是对应的捕获组内容。
 * 5. 将所有这些对象收集到一个数组中，并返回这个数组作为最终结果。
 */
function createObjectsFromRegexMatches(
  regexPattern: string,
  targetString: string,
  propertiesArray: string[]
): object[] {
  const regex = new RegExp(regexPattern, 'g')
  let match
  const resultObjects: object[] = []

  while ((match = regex.exec(targetString)) !== null) {
    if (match.length - 1 === propertiesArray.length) {
      // 确保捕获组数量与属性数组长度一致
      const obj = {}
      propertiesArray.forEach((propertyName, index) => {
        obj[propertyName] = match[index + 1] // 匹配值从index 1开始，因为index 0是整个匹配的字符串
      })
      resultObjects.push(obj)
    } else {
      const msg = `捕获组数量与属性数组长度不匹配，请检查正则表达式与属性名数组是否匹配。regexPattern: ${regexPattern} ; propertiesArray: ${propertiesArray}`
      LogUtil.error('StringUtil', msg)
      throw new Error(msg)
    }
  }

  return resultObjects
}

export default {
  isBlank,
  isNotBlank,
  camelToSnakeCase,
  snakeToCamelCase,
  removePrefixIfPresent,
  createObjectsFromRegexMatches
}
