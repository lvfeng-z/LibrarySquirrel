import { defineStore } from 'pinia'
import NotificationItem from '@renderer/model/util/NotificationItem.ts'
import { v4 } from 'uuid'
import { ElNotification } from 'element-plus'
import { h } from 'vue'
import { IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'

export const useNotificationStore = defineStore('notification', {
  state: (): { notifications: Map<string, NotificationItem> } => {
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
    return { notifications: new Map<string, NotificationItem>() }
  },
  actions: {
    add(notificationItem: NotificationItem): string {
      const id: string = v4()
      notificationItem.id = id
      this.$state.notifications.set(id, notificationItem)
      return id
    },
    get(id: string): NotificationItem | undefined {
      return this.$state.notifications.get(id)
    },
    remove(
      id: string,
      notificationConfig?: { type?: 'error' | 'primary' | 'success' | 'warning' | 'info'; msg: string; duration?: number }
    ): void {
      this.$state.notifications.delete(id)
      let type = notificationConfig?.type
      if (IsNullish(type)) {
        type = 'info'
      }
      let duration = notificationConfig?.duration
      if (IsNullish(duration)) {
        duration = 3000
      }
      if (NotNullish(notificationConfig)) {
        ElNotification({
          type: type,
          message: h('i', {}, notificationConfig.msg),
          duration: duration
        })
      }
    }
  },
  getters: {
    count: (state): number => state.notifications.size
  }
})
