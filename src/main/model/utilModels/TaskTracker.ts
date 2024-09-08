import { Readable } from 'node:stream'
import fs from 'fs'

export interface TaskTracker {
  readStream: Readable
  writeStream: fs.WriteStream
  bytesSum: number
}
