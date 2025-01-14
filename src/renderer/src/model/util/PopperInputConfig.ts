import { VNode } from 'vue'
import { notNullish } from '@renderer/utils/CommonUtil.ts'
import { CommonInputConfig, ICommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'

export class PopperInputConfig extends CommonInputConfig implements IPopperInputConfig {
  popperRender?: (data?) => VNode

  constructor(config: ICommonInputConfig) {
    super(config)
  }

  public refreshSelectData(query?: unknown) {
    if (notNullish(this.load)) {
      this.load(query).then((data) => (this.selectData = data))
    }
  }
}

export interface IPopperInputConfig extends ICommonInputConfig {
  popperRender?: (data?) => VNode
}
