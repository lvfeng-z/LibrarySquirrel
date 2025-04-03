import lodash from 'lodash'

export function NonUndefinedValue(obj: object | undefined): object {
  if (obj === undefined) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(obj).filter((keyValue) => {
      return keyValue[1] !== undefined
    })
  )
}

export function GetPropByPath(obj: object, path: string) {
  // 将路径字符串按照'.'分割成数组
  const properties = path.split('.')

  // 遍历数组，逐步访问obj中的属性
  let result = obj
  for (const prop of properties) {
    if (!Object.prototype.hasOwnProperty.call(result, prop)) {
      // 如果属性不存在，则返回undefined
      return undefined
    }
    result = result[prop]
  }
  return result
}

export function SetPropByPath(obj: object, path: string, val: unknown) {
  // 将路径字符串按照'.'分割成数组
  const properties = path.split('.')

  // 遍历数组，逐步访问obj中的属性
  let result = obj
  let index = 1
  for (const prop of properties) {
    if (!Object.prototype.hasOwnProperty.call(result, prop)) {
      // 如果属性不存在，则返回undefined
      return
    }
    if (index === properties.length) {
      result[prop] = val
      break
    }
    result = result[prop]
    index++
  }
}

/**
 * 将指定属性从json字符串解析为指定对象
 * @param source
 * @param properties
 * @constructor
 */
export function ParsePropertyFromJson(source: object, properties: { property: string; builder: (arg) => unknown }[]) {
  for (const property of properties) {
    if (typeof source[property.property] === 'string') {
      try {
        const tempObj = JSON.parse(source[property.property])
        source[property.property] = property.builder(tempObj)
      } catch (error) {
        console.error('ObjectUtil', error)
      }
    }
  }
}

export function CopyIgnoreUndefined(target: object, source: object) {
  lodash.assignWith(target, source, (targetValue, sourceValue) => {
    if (sourceValue === undefined) {
      return targetValue
    } else {
      return sourceValue
    }
  })
}
