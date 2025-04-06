import SiteTagLocalRelateDTO from '@renderer/model/main/dto/SiteTagLocalRelateDTO.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'

export default class SiteTagVO extends SiteTagLocalRelateDTO {
  localTagSelectItem: SelectItem | undefined | null
}
