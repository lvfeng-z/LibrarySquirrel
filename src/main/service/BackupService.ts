import BaseService from '../base/BaseService.js'
import BackupQueryDTO from '../model/queryDTO/BackupQueryDTO.js'
import Backup from '../model/entity/Backup.js'
import BackupDao from '../dao/BackupDao.js'
import DatabaseClient from '../database/DatabaseClient.js'
import { BackupSourceTypeEnum } from '../constant/BackupSourceTypeEnum.js'
import fs from 'fs/promises'
import LogUtil from '../util/LogUtil.js'
import { AddSuffix, CreateDirIfNotExists } from '../util/FileSysUtil.js'
import path from 'path'
import { BackupRootDirName } from '../constant/BackupConstants.js'
import { cp } from 'node:fs/promises'
import { AssertNotBlank, AssertNotNullish } from '../util/AssertUtil.js'
import { getSettings } from '../core/settings.ts'

export default class BackupService extends BaseService<BackupQueryDTO, Backup, BackupDao> {
  constructor(db?: DatabaseClient) {
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

    const workdir = getSettings().store.workdir
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

    return this.transaction<Backup>(async () => {
      const backup = new Backup()
      backup.sourceType = sourceType
      backup.sourceId = sourceId
      backup.workdir = workdir
      backup.filePath = path.join(relativePath, fileName)
      backup.fileName = fileName
      backup.id = await this.save(backup)

      await cp(sourceFilePath, finalAbsolutePath, { recursive: true })
      return backup
    }, '创建文件备份')
  }

  /**
   * 备份恢复到指定目录
   * @param backUpId 备份id
   * @param targetPath 目录（包含文件名）
   * @param deleteAfterFinish 恢复完成后删除备份
   */
  public async recoverToPath(backUpId: number, targetPath: string, deleteAfterFinish: boolean = false): Promise<void> {
    const targetDirname = path.dirname(targetPath)
    AssertNotBlank(targetDirname, `无法恢复备份到${targetPath}，给定的路径为空`)
    const backup = await this.getById(backUpId)
    AssertNotNullish(backup, this.constructor.name, `无法恢复备份到${targetPath}，备份不存在，backupId: ${backUpId}`)
    const workdir = getSettings().store.workdir
    const absoluteBackupPath = path.join(workdir, backup.filePath as string)
    try {
      await fs.access(absoluteBackupPath)
    } catch (error) {
      LogUtil.error(this.constructor.name, '恢复备份失败，找不到备份文件', error)
      throw error
    }
    return fs
      .cp(absoluteBackupPath, targetPath, { recursive: true })
      .then((result) => {
        if (deleteAfterFinish) {
          this.deleteBackupByIdAndPath(backUpId, absoluteBackupPath).catch()
        }
        return result
      })
      .catch((error) => {
        LogUtil.error(this.constructor.name, `恢复备份到${targetPath}失败，error: `, error)
        throw error
      })
  }

  public async deleteBackup(backUpId: number): Promise<number> {
    const backup = await this.getById(backUpId)
    AssertNotNullish(backup, this.constructor.name, `删除备份失败，备份id不可用，backupId: ${backUpId}`)
    const workdir = getSettings().store.workdir
    const absoluteBackupPath = path.join(workdir, backup.filePath as string)
    try {
      await fs.access(absoluteBackupPath)
    } catch (error) {
      LogUtil.error(this.constructor.name, '删除备份失败，找不到备份文件', error)
      throw error
    }
    return this.deleteBackupByIdAndPath(backUpId, absoluteBackupPath)
  }

  private async deleteBackupByIdAndPath(backUpId: number, absoluteBackupPath: string): Promise<number> {
    return this.transaction<number>(async () => {
      await fs.rm(absoluteBackupPath, { recursive: true })
      return this.deleteById(backUpId)
    }, '删除备份')
  }
}
