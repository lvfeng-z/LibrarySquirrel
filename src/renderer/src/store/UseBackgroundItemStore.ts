import { defineStore } from 'pinia'
import BackgroundItem from '@renderer/model/util/BackgroundItem.ts'
import { v4 } from 'uuid'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'
import { ElNotification } from 'element-plus'
import { h } from 'vue'

export const useBackgroundItemStore = defineStore('backgroundItem', {
  state: (): BackgroundItem[] => {
    const result: BackgroundItem[] = []
    // let i = 0
    // while (i < 20) {
    //   const item = new BackgroundItem()
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
    add(backgroundItem: BackgroundItem): string {
      if (IsNullish(backgroundItem.removeOnSettle)) {
        throw new Error('添加后台任务失败，removeOnSettle不能为空')
      }
      backgroundItem.removeOnSettle
        .then((msg: string) => {
          if (backgroundItem.noticeOnRemove) {
            ElNotification({
              type: 'success',
              message: h('i', {}, msg),
              duration: backgroundItem.noticeDuration
            })
          }
          setTimeout(() => {
            const index = this.$state.findIndex((item) => backgroundItem.id === item.id)
            this.$state.splice(index, 1)
          }, 10000)
        })
        .catch((error: Error) => {
          if (backgroundItem.noticeOnRemove) {
            ElNotification({
              type: 'error',
              message: h('i', {}, error.message),
              duration: backgroundItem.noticeDuration
            })
          }
          setTimeout(() => {
            const index = this.$state.findIndex((item) => backgroundItem.id === item.id)
            this.$state.splice(index, 1)
          }, 20000)
        })
      const id: string = v4()
      backgroundItem.id = id
      this.$state.push(backgroundItem)
      return id
    }
  }
})
