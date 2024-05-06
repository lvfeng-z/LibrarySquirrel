import BaseModel from '../BaseModel'

export class BaseQueryDTO extends BaseModel {
  keyword: string | undefined | null
  constructor(baseQueryDTO: BaseQueryDTO) {
    super(baseQueryDTO)
    this.keyword = baseQueryDTO.keyword
  }

  public getKeywordLikeString() {
    return '%' + this.keyword + '%'
  }
}
