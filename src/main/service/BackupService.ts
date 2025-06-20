import BaseService from '../base/BaseService.js'
import BackupQueryDTO from '../model/queryDTO/BackupQueryDTO.js'
import Backup from '../model/entity/Backup.js'
import BackupDao from '../dao/BackupDao.js'
import DB from '../database/DB.js'
import { BackupSourceTypeEnum } from '../constant/BackupSourceTypeEnum.js'
import fs from 'fs/promises'
import LogUtil from '../util/LogUtil.js'
import { AddSuffix, CreateDirIfNotExists } from '../util/FileSysUtil.js'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'
import path from 'path'
import { BackupRootDirName } from '../constant/BackupConstants.js'
import { copyFile } from 'node:fs/promises'

export default class BackupService extends BaseService<BackupQueryDTO, Backup, BackupDao> {
  constructor(db?: DB) {
    super(BackupDao, db)
  }

  /**
   * 创建备份
   * @param sourceType 源数据类型
   * @param sourceId 源数据id
   * @param sourceFilePath 源文件路径
   */
  async createBackup(sourceType: BackupSourceTypeEnum, sourceId: number, sourceFilePath: string): Promise<Backup> {
    try {
      await fs.access(sourceFilePath)
    } catch (error) {
      LogUtil.error(
        this.constructor.name,
        `创建备份失败，源文件不存在，sourceType: ${sourceType}, sourceId: ${sourceId}, path: ${sourceFilePath}`
      )
      throw error
    }

    const settings = GlobalVar.get(GlobalVars.SETTINGS)
    const workdir = settings.get('workdir')
    // 获取年、月、日
    const now = new Date()
    const year = now.getFullYear() // 四位数年份
    const month = now.getMonth() + 1 // 0-11 → 1-12
    const day = now.getDate() // 1-31

    // 转换为字符串并补齐两位
    const yearStr = year.toString()
    const monthStr = month.toString().padStart(2, '0') // 补零
    const dayStr = day.toString().padStart(2, '0') // 补零
    const relativePath = path.join(BackupRootDirName, yearStr, monthStr, dayStr)
    const absolutePath = path.join(workdir, relativePath)
    await CreateDirIfNotExists(absolutePath)
    let fileName = path.basename(sourceFilePath)
    let fileNameAccepted = false

    // 生成文件名称
    let finalAbsolutePath: string
    while (!fileNameAccepted) {
      finalAbsolutePath = path.join(absolutePath, fileName)
      try {
        await fs.access(finalAbsolutePath)
        fileName = AddSuffix(fileName, '_' + Date.now())
        LogUtil.info(this.constructor.name, `文件${finalAbsolutePath}已存在，尝试文件名: ${fileName}`)
      } catch {
        fileNameAccepted = true
      }
    }

    return this.db.transaction(async () => {
      const backup = new Backup()
      backup.sourceType = sourceType
      backup.sourceId = sourceId
      backup.workdir = workdir
      backup.filePath = path.join(relativePath, fileName)
      backup.fileName = fileName
      await this.save(backup)

      await copyFile(sourceFilePath, finalAbsolutePath)
      return backup
    }, '创建文件备份')
  }
}
