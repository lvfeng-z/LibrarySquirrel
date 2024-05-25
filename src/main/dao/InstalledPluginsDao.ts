import BaseDao from './BaseDao.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import InstalledPluginsQueryDTO from '../model/queryDTO/InstalledPluginsQueryDTO.ts'

export default class InstalledPluginsDao extends BaseDao<
  InstalledPluginsQueryDTO,
  InstalledPlugins
> {
  constructor() {
    super('installed_plugins', 'InstalledPluginsDao')
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
