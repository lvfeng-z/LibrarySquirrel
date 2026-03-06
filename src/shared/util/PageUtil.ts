import Page from '@shared/model/util/Page.ts'

/**
 * 内存分页工具类
 * 用于对内存中的数据进行分页查询
 */
export class PageUtil {
  /**
   * 对数组进行分页
   * @param data 原始数据数组
   * @param pageNumber 页码（从1开始）
   * @param pageSize 每页大小
   * @returns 分页后的数据
   */
  static paginate<T>(data: T[], pageNumber: number, pageSize: number): T[] {
    if (!data || data.length === 0) {
      return []
    }
    const startIndex = (pageNumber - 1) * pageSize
    const endIndex = startIndex + pageSize
    return data.slice(startIndex, endIndex)
  }

  /**
   * 对数组进行分页并返回Page对象
   * @param data 原始数据数组
   * @param page 分页参数（包含pageNumber和pageSize）
   * @returns 包含分页信息的Page对象
   */
  static paginateWithPage<T, Q>(data: T[], page: Page<Q, T>): Page<Q, T> {
    const result = page.copy<Q, T>()
    result.dataCount = data.length
    result.pageCount = Math.ceil(data.length / page.pageSize)
    result.currentCount = 0

    if (data.length > 0) {
      const pageData = this.paginate(data, page.pageNumber, page.pageSize)
      result.data = pageData
      result.currentCount = pageData.length
    } else {
      result.data = []
    }

    return result
  }
}
