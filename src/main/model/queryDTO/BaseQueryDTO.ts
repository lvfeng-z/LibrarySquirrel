import BaseModel from '../BaseModel.ts'

export default class BaseQueryDTO extends BaseModel {
  keyword: string | undefined | null
  constructor(baseQueryDTO?: BaseQueryDTO) {
    super(baseQueryDTO)
    this.keyword = baseQueryDTO === undefined ? undefined : baseQueryDTO.keyword
  }

  public getKeywordLikeString() {
    return '%' + this.keyword + '%'
  }
}
