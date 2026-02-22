import LogUtil from '../../main/util/LogUtil.ts'

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
        LogUtil.error('ObjectUtil', error)
      }
    }
  }
}

export default {
  ParsePropertyFromJson
}
