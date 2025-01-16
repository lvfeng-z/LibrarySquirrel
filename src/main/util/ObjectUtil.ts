/**
 * 去除值为undefined的属性
 * @param obj
 */
function nonUndefinedValue(obj: object | undefined): object {
  if (obj === undefined) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(obj).filter((keyValue) => {
      return keyValue[1] !== undefined
    })
  )
}

/**
 * 把所有undefined的值改为null
 * @param obj
 */
function undefinedToNull(obj: object | undefined): object {
  if (obj === undefined) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (value === undefined) {
        return [key, null]
      } else {
        return [key, value]
      }
    })
  )
}

/**
 * 对齐对象列表的属性
 * @param objects 对象列表
 * @param fill 如何填充被对齐的值
 */
function alignProperties(objects: object[], fill: unknown) {
  // 所有可能的属性名集合
  const allPossibleProperties = [...new Set(objects.flatMap(Object.keys))]
  // 创建一个模板对象，所有属性设为fill
  const templateObject = allPossibleProperties.reduce((acc, key) => ({ ...acc, [key]: fill }), {})

  // 遍历对象列表，补全每个对象的属性
  return objects.map((obj) => {
    // 合并当前对象与模板对象，模板对象中的属性会覆盖或补充到当前对象中
    return { ...templateObject, ...obj }
  })
}

/**
 * 合并两个对象的属性，优先选择非undefined的属性，若均为非undefined，则选择首个入参（source）的属性
 * @param obj1
 * @param obj2
 */
function mergeObjects(obj1: object, obj2: object): object {
  // 创建一个新的对象用于存放合并后的结果
  const merged = {}

  // 获取所有需要合并的对象的keys
  const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)])

  // 遍历这些keys来合并属性
  keys.forEach((key) => {
    const obj1Own: boolean = Object.prototype.hasOwnProperty.call(obj1, key)
    const obj2Own: boolean = Object.prototype.hasOwnProperty.call(obj2, key)
    // 如果两个对象在该key上的值都不是undefined，那么取obj1的值
    if (obj1Own && obj2Own) {
      merged[key] = obj1[key] !== undefined ? obj1[key] : obj2[key]
    }
    // 如果obj1有这个key而obj2没有，直接取obj1的值
    else if (obj1Own) {
      merged[key] = obj1[key]
    }
    // 同理，如果obj2有这个key而obj1没有，直接取obj2的值
    else if (obj2Own) {
      merged[key] = obj2[key]
    }
  })

  return merged
}

export default {
  nonUndefinedValue,
  undefinedToNull,
  alignProperties,
  mergeObjects
}
