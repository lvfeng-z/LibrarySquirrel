import Site from '../model/Site.ts'
import SiteDao from '../dao/SiteDao.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import ApiUtil from '../util/ApiUtil.ts'

async function save(site: Site) {
  const dao = new SiteDao()
  return ApiUtil.response(await dao.save(site))
}

async function getSelectList(queryDTO: SiteQueryDTO) {
  const dao = new SiteDao()
  return ApiUtil.response(await dao.getSelectList(queryDTO))
}

export default {
  save,
  getSelectList
}
