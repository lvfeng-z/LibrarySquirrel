import Site from '../model/Site'
import { SiteDao } from '../dao/SiteDao'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO'
import { ApiUtil } from '../util/ApiUtil'

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
