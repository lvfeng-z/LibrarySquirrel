import { TransactionContext } from './TransactionContext.ts'

/**
 * 事务装饰器选项
 */
interface TransactionDecoratorOptions {
  /** 操作描述 */
  operation: string
  /** 调用者标识（默认使用类名） */
  caller?: string
}

/**
 * 事务装饰器
 * 使用示例：
 *
 * class WorkService extends BaseService {
 *   @Transactional({ operation: '保存作品' })
 *   async saveWork(work: Work): Promise<number> {
 *     // 自动在事务中执行
 *     return await this.dao.save(work)
 *   }
 * }
 *
 * // 或者简写形式
 * class WorkService extends BaseService {
 *   @Transactional('保存作品')
 *   async saveWork(work: Work): Promise<number> {
 *     return await this.dao.save(work)
 *   }
 * }
 */
function Transactional(options: string | TransactionDecoratorOptions) {
  const config = typeof options === 'string' ? { operation: options } : options

  return function <T extends (...args: unknown[]) => Promise<unknown>>(target: T) {
    const originalMethod = target

    return async function (this: object, ...args: Parameters<T>): Promise<ReturnType<T>> {
      const caller = config.caller || this.constructor?.name || 'Anonymous'

      return TransactionContext.runInTransaction(caller, config.operation, () => originalMethod.apply(this, args)) as Promise<
        ReturnType<T>
      >
    }
  }
}

/**
 * 高阶函数方式（兼容现有代码风格）
 *
 * 使用示例：
 *
 * class WorkService extends BaseService {
 *   async saveWork(work: Work): Promise<number> {
 *     return transactional('保存作品', async () => {
 *       return await this.dao.save(work)
 *     })
 *   }
 * }
 *
 * // 手动指定调用者
 * class WorkService extends BaseService {
 *   async saveWork(work: Work): Promise<number> {
 *     return transactional('保存作品', async () => {
 *       return await this.dao.save(work)
 *     }, 'WorkService')
 *   }
 * }
 */
async function transactional<R>(operation: string, fn: () => Promise<R>, caller?: string): Promise<R> {
  return TransactionContext.runInTransaction(caller || 'Anonymous', operation, fn)
}

export { Transactional, transactional }
export type { TransactionDecoratorOptions }
