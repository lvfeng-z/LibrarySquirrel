import { query, baseInsert } from '../database/mapper/TagMapper'
import { ipcMain } from 'electron'
function queryTag() {
  const result = query().then((res) => {
    console.log(res)
    return result
  })
}

function insertTag(tag) {
  return baseInsert(tag)
}

// 将方法作为 IPC 处理器暴露出去
ipcMain.on('TagService-insertTag', (_event, args) => insertTag(args))
ipcMain.handle('TagService-queryTag', () => queryTag())

export default {
  queryTag,
  insertTag
}
