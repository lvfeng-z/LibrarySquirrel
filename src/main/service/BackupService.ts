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
import { AssertNotBlank, AssertNotNullish } from '../util/AssertUtil.js'

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
  public async createBackup(sourceType: BackupSourceTypeEnum, sourceId: number, sourceFilePath: string): Promise<Backup> {
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

  /**
   * 备份恢复到指定目录
   * @param backUpId 备份id
   * @param targetPath 目录（包含文件名）
   */
  public async recoverToPath(backUpId: number, targetPath: string): Promise<void> {
    const targetDirname = path.dirname(targetPath)
    AssertNotBlank(targetDirname, `无法恢复备份到${targetPath}，给定的目录为空`)
    const backup = await this.getById(backUpId)
    AssertNotNullish(backup, this.constructor.name, `无法恢复备份到${targetPath}，备份不存在，backupId: ${backUpId}`)
    const workdir = GlobalVar.get(GlobalVars.SETTINGS).store.workdir
    const absoluteBackupPath = path.join(workdir, backup.filePath as string)
    try {
      await fs.access(absoluteBackupPath)
    } catch (error) {
      LogUtil.error(this.constructor.name, '创建备份失败，找不到备份文件', error)
      throw error
    }
    await CreateDirIfNotExists(targetDirname)
    // TODO
  }
}
