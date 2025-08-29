import IPage from '@renderer/model/util/IPage.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import Page from '@renderer/model/util/Page.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'
import { ElMessage } from 'element-plus'

/**
 * 分页查询本地标签选择列表
 * @param page
 */
export async function localTagQuerySelectItemPage(page: IPage<unknown, SelectItem>): Promise<IPage<unknown, SelectItem>> {
  const response = await window.api.localTagQuerySelectItemPage(page)

  // 解析响应值
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data<Page<unknown, SelectItem>>(response)
    if (IsNullish(newPage)) {
      const msg = '分页查询本地标签选择列表，没有返回分页数据'
      ElMessage({ message: msg, type: 'error' })
      throw new Error(msg)
    }
    return newPage
  } else {
    ApiUtil.failedMsg(response)
    throw new Error()
  }
}

/**
 * 分页查询本地标签选择列表
 * @param page
 * @param localTagName
 */
export async function localTagQuerySelectItemPageByName(
  page: IPage<unknown, SelectItem>,
  localTagName: string
): Promise<IPage<unknown, SelectItem>> {
  page.query = { localTagName }
  return localTagQuerySelectItemPage(page)
}
