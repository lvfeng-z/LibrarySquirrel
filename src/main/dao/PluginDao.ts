import BaseDao from './BaseDao.ts'
import Plugin from '../model/entity/Plugin.ts'
import PluginQueryDTO from '../model/queryDTO/PluginQueryDTO.ts'
import DB from '../database/DB.ts'

export default class PluginDao extends BaseDao<PluginQueryDTO, Plugin> {
  constructor(db?: DB) {
    super('plugin', 'PluginDao', db)
  }
}
