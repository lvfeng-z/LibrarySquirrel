import Path from 'path'
import InstalledPluginsDao from '../dao/InstalledPluginsDao.ts'
import FileSysUtil from '../util/FileSysUtil.ts'

/**
 * 根据id获取插件加载路径
 */
async function getClassPathById(id: number): Promise<string> {
  const dao = new InstalledPluginsDao()
  const installedPlugin = await dao.getById(id)
  return Path.join(
    'file://',
    FileSysUtil.getRootDir(),
    '/resources/plugins/task',
    installedPlugin.author as string,
    installedPlugin.domain as string,
    installedPlugin.version as string,
    'code',
    installedPlugin.className as string
  )
}

export default {
  getClassPathById
}
