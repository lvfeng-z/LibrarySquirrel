import PageModel from '../model/utilModels/PageModel.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { WorksDao } from '../dao/WorksDao.ts'
import ApiUtil from '../util/ApiUtil.ts'

async function queryPage(page: PageModel<WorksQueryDTO, WorksDTO>): Promise<ApiUtil> {
  page = new PageModel(page)
  const dao = new WorksDao()
  try {
    await dao.queryPage(page)
    return ApiUtil.response(page)
  } catch (error) {
    return ApiUtil.error(String(error))
  }
}

export default {
  queryPage
}
