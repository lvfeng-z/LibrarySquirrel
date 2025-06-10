import IPage from '@renderer/model/util/IPage.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import Page from '@renderer/model/util/Page.ts'
import LocalTagQueryDTO from '@renderer/model/main/queryDTO/LocalTagQueryDTO.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 分页请求站点选择列表
 * @param sitePage
 * @param siteName
 */
export async function siteQuerySelectItemPage(
  sitePage: IPage<unknown, SelectItem>,
  siteName?: string
): Promise<IPage<unknown, SelectItem>> {
  sitePage.query = { siteName }
  const response = await window.api.siteQuerySelectItemPage(sitePage)
  const newPage = ApiUtil.data<Page<LocalTagQueryDTO, SelectItem>>(response)
  if (IsNullish(newPage)) {
    ApiUtil.failedMsg(response)
    throw new Error()
  }
  return newPage
}
