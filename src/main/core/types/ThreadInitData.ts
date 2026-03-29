export interface ThreadInitData {
  workerId: number
  threadType: 'task' | 'db'
  isMainThread: false
}
