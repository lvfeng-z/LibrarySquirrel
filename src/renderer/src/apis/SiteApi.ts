import IPage from '@renderer/model/util/IPage.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import Page from '@renderer/model/util/Page.ts'
import LocalTagQueryDTO from '@renderer/model/main/queryDTO/LocalTagQueryDTO.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'
import { ElMessage } from 'element-plus'

/**
 * 分页查询站点选择列表
 * @param sitePage
 * @param siteName
 */
export async function siteQuerySelectItemPageBySiteName(
  sitePage: IPage<unknown, SelectItem>,
  siteName: string
): Promise<IPage<unknown, SelectItem>> {
  sitePage.query = { siteName }
  return siteQuerySelectItemPage(sitePage)
}

/**
 * 分页查询站点选择列表
 * @param sitePage
 */
export async function siteQuerySelectItemPage(sitePage: IPage<unknown, SelectItem>): Promise<IPage<unknown, SelectItem>> {
  const response = await window.api.siteQuerySelectItemPage(sitePage)
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data<Page<LocalTagQueryDTO, SelectItem>>(response)
    if (IsNullish(newPage)) {
      const msg = '分页查询站点选择列表失败，没有返回分页数据'
      ElMessage({ message: msg, type: 'error' })
      throw new Error(msg)
    }
    return newPage
  } else {
    ApiUtil.failedMsg(response)
    throw new Error()
  }
}
