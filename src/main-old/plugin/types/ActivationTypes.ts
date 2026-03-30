import { ActivationType } from '@shared/model/constant/ActivationType.ts'

// 重新导出 shared 模块中的 ActivationType
export { ActivationType }

/**
 * 激活配置
 */
export interface ActivationConfig {
  /** 加载时机 */
  type: ActivationType
  /** 依赖的其他贡献点（可选） */
  dependencies?: string[]
}
