import { defineStore } from 'pinia'
import NotificationItem from '@renderer/model/util/NotificationItem.ts'
import { v4 } from 'uuid'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'
import { ElNotification } from 'element-plus'
import { h } from 'vue'
import StringUtil from '@renderer/utils/StringUtil.ts'

export const useNotificationStore = defineStore('notification', {
  state: (): NotificationItem[] => {
    const result: NotificationItem[] = []
    // let i = 0
    // while (i < 20) {
    //   const item = new NotificationItem()
    //   item.id = String(i)
    //   item.title = 'title测试一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十'
    //   item.description = 'description测试123456789123456789123456789'
    //   item.render = () => h(ElTag, { style: 'color: teal' }, 'ets')
    //   result.push(item)
    //   i++
    // }
    return result
  },
  actions: {
    add(notificationItem: NotificationItem): string {
      if (IsNullish(notificationItem.removeOnSettle)) {
        throw new Error('添加后台任务失败，removeOnSettle不能为空')
      }
      notificationItem.removeOnSettle
        .then((msg: string | undefined) => {
          if (StringUtil.isNotBlank(msg)) {
            ElNotification({
              type: 'success',
              message: h('i', {}, msg),
              duration: notificationItem.noticeDuration
            })
          }
          setTimeout(() => {
            const index = this.$state.findIndex((item) => notificationItem.id === item.id)
            this.$state.splice(index, 1)
          }, 10000)
        })
        .catch((error: Error) => {
          ElNotification({
            type: 'error',
            message: h('i', {}, error.message),
            duration: notificationItem.noticeDuration
          })
          setTimeout(() => {
            const index = this.$state.findIndex((item) => notificationItem.id === item.id)
            this.$state.splice(index, 1)
          }, 20000)
        })
      const id: string = v4()
      notificationItem.id = id
      this.$state.push(notificationItem)
      return id
    }
  }
})
