import { ContributionKey } from './ContributionTypes.ts'

/**
 * 贡献点文件路径信息
 * @description 用于在子线程中加载贡献点的必要信息
 */
export interface ContributionFilePathInfo {
  /** 插件入口文件路径 */
  entryPath: string
  /** 贡献点键名 */
  key: ContributionKey
  /** 贡献点 ID */
  contributionId: string
}

/**
 * 获取贡献点的选项
 */
export interface GetContributionOptions {
  /** 是否返回文件路径信息而非贡献点对象 */
  returnFilePath?: boolean
}
