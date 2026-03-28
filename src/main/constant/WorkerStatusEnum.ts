/**
 * 工作线程状态枚举
 */
export enum WorkerStatusEnum {
  /** 空闲 */
  IDLE = 0,
  /** 运行中 */
  RUNNING = 1,
  /** 已暂停 */
  PAUSED = 2,
  /** 已停止 */
  STOPPED = 3
}
