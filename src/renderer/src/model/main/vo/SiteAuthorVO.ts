import SiteAuthorLocalRelateDTO from '@renderer/model/main/dto/SiteAuthorLocalRelateDTO.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'

export default class SiteAuthorVO extends SiteAuthorLocalRelateDTO {
  localAuthorSelectItem: SelectItem | undefined | null
}
