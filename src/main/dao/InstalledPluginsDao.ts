import BaseDao from './BaseDao.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import InstalledPluginsQueryDTO from '../model/queryDTO/InstalledPluginsQueryDTO.ts'
import DB from '../database/DB.ts'

export default class InstalledPluginsDao extends BaseDao<
  InstalledPluginsQueryDTO,
  InstalledPlugins
> {
  constructor(db?: DB) {
    super('installed_plugins', 'InstalledPluginsDao', db)
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
