import BaseModel from '../BaseModel.ts'

export default class BaseQueryDTO extends BaseModel {
  keyword: string | undefined | null

  constructor(baseQueryDTO?: BaseQueryDTO) {
    super(baseQueryDTO)
    if (baseQueryDTO === undefined) {
      this.keyword = undefined
    } else {
      this.keyword = baseQueryDTO.keyword
    }
  }
}
