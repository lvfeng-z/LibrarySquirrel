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
 * 对其对象列表的属性
 * @param objects 对象列表
 * @param fill 如何填充被对齐的值
 */
function alignProperties(objects: object[], fill: unknown) {
  // 所有可能的属性名集合（这里需要你根据实际情况定义）
  const allPossibleProperties = [...new Set(objects.flatMap(Object.keys))]
  // 创建一个模板对象，所有属性设为fill
  const templateObject = allPossibleProperties.reduce((acc, key) => ({ ...acc, [key]: fill }), {})

  // 遍历对象列表，补全每个对象的属性
  return objects.map((obj) => {
    // 合并当前对象与模板对象，模板对象中的属性会覆盖或补充到当前对象中
    return { ...templateObject, ...obj }
  })
}

export default {
  nonUndefinedValue,
  undefinedToNull,
  alignProperties
}
