import BaseService from '../base/BaseService.ts'
import SecureStorageDao from '../dao/SecureStorageDao.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import SecureStorage from '@shared/model/entity/SecureStorage.ts'
import SecureStorageQueryDTO from '@shared/model/queryDTO/SecureStorageQueryDTO.ts'
import Electron from 'electron'

/**
 * 安全存储错误码
 */
export enum SecureStorageErrorCode {
  /**
   * 安全存储不可用（未加密或系统不支持）
   */
  NOT_AVAILABLE = 'SECURE_STORAGE_NOT_AVAILABLE',

  /**
   * 加密失败
   */
  ENCRYPT_FAILED = 'SECURE_STORAGE_ENCRYPT_FAILED',

  /**
   * 解密失败
   */
  DECRYPT_FAILED = 'SECURE_STORAGE_DECRYPT_FAILED',

  /**
   * 密钥不存在
   */
  KEY_NOT_FOUND = 'SECURE_STORAGE_KEY_NOT_FOUND',

  /**
   * 存储键无效
   */
  INVALID_KEY = 'SECURE_STORAGE_INVALID_KEY',

  /**
   * 数据库操作失败
   */
  DATABASE_ERROR = 'SECURE_STORAGE_DATABASE_ERROR'
}

/**
 * 加密存储服务
 * 提供加密、解密、密文存储和读取功能
 * 使用 Electron safeStorage 进行加密和解密
 */
export default class SecureStorageService extends BaseService<
  SecureStorageQueryDTO,
  SecureStorage,
  SecureStorageDao
> {
  constructor(db?: DatabaseClient) {
    super(SecureStorageDao, db)
  }

  /**
   * 检查 safeStorage 是否可用
   */
  private checkAvailable(): void {
    if (!Electron.safeStorage.isEncryptionAvailable()) {
      throw new Error(SecureStorageErrorCode.NOT_AVAILABLE)
    }
  }

  /**
   * 加密字符串
   * @param plainText 明文
   * @returns 密文（Base64编码）
   */
  private encrypt(plainText: string): string {
    this.checkAvailable()
    try {
      const encrypted = Electron.safeStorage.encryptString(plainText)
      return encrypted.toString('base64')
    } catch (error) {
      throw new Error(SecureStorageErrorCode.ENCRYPT_FAILED)
    }
  }

  /**
   * 解密字符串
   * @param encryptedBase64 密文（Base64编码）
   * @returns 明文
   */
  private decrypt(encryptedBase64: string): string {
    this.checkAvailable()
    try {
      const encrypted = Buffer.from(encryptedBase64, 'base64')
      return Electron.safeStorage.decryptString(encrypted)
    } catch (error) {
      throw new Error(SecureStorageErrorCode.DECRYPT_FAILED)
    }
  }

  /**
   * 验证存储键
   * @param storageKey 存储键
   */
  private validateKey(storageKey: string | undefined | null): void {
    if (!storageKey || storageKey.trim() === '') {
      throw new Error(SecureStorageErrorCode.INVALID_KEY)
    }
  }

  /**
   * 存储加密值
   * @param storageKey 存储键
   * @param plainValue 明文值
   * @param description 描述（可选）
   */
  async set(storageKey: string, plainValue: string, description?: string): Promise<number> {
    this.validateKey(storageKey)

    const encryptedValue = this.encrypt(plainValue)

    // 检查是否已存在
    const existing = await this.getByKey(storageKey)

    if (existing) {
      // 更新
      existing.encryptedValue = encryptedValue
      if (description !== undefined) {
        existing.description = description
      }
      existing.updateTime = Date.now()
      return this.updateById(existing)
    } else {
      // 新增
      const entity = new SecureStorage()
      entity.storageKey = storageKey
      entity.encryptedValue = encryptedValue
      entity.description = description
      return this.save(entity)
    }
  }

  /**
   * 获取解密后的值
   * @param storageKey 存储键
   * @returns 解密后的明文值，如果不存在则返回 undefined
   */
  async getValue(storageKey: string): Promise<string | undefined> {
    this.validateKey(storageKey)

    const entity = await this.getByKey(storageKey)
    if (!entity || !entity.encryptedValue) {
      return undefined
    }

    return this.decrypt(entity.encryptedValue)
  }

  /**
   * 根据存储键获取实体
   * @param storageKey 存储键
   */
  async getByKey(storageKey: string): Promise<SecureStorage | undefined> {
    const query = new SecureStorageQueryDTO()
    query.storageKey = storageKey
    return super.get(query)
  }

  /**
   * 删除存储键
   * @param storageKey 存储键
   * @returns 删除的行数
   */
  async remove(storageKey: string): Promise<number> {
    this.validateKey(storageKey)

    const query = new SecureStorageQueryDTO()
    query.storageKey = storageKey
    return super.delete(query)
  }

  /**
   * 检查存储键是否存在
   * @param storageKey 存储键
   */
  async hasKey(storageKey: string): Promise<boolean> {
    const entity = await this.getByKey(storageKey)
    return entity !== undefined
  }

  /**
   * 获取所有存储键
   * @returns 存储键列表
   */
  async listKeys(): Promise<string[]> {
    const query = new SecureStorageQueryDTO()
    const list = await super.list(query)
    return list
      .filter((item) => item.storageKey)
      .map((item) => item.storageKey as string)
  }
}
