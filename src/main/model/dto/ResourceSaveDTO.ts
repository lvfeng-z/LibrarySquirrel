import Resource from '../entity/Resource.js'
import { Readable } from 'node:stream'
import { NotNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'

export default class ResourceSaveDTO extends Resource {
  /**
   * 保存路径
   */
  fullSavePath: string | undefined | null

  /**
   * 作品资源的数据流
   */
  resourceStream: Readable | undefined | null

  constructor(resource?: Resource) {
    super(resource)
    if (NotNullish(resource)) {
      lodash.assign(this, lodash.pick(resource, ['fullSavePath', 'resourceStream', 'resourceSize']))
    }
  }
}
