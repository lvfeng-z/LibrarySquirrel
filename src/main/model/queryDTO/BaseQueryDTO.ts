export class BaseQueryDTO {
  keyword: string | undefined | null
  constructor(baseQueryDTO: BaseQueryDTO) {
    this.keyword = baseQueryDTO.keyword
  }
}