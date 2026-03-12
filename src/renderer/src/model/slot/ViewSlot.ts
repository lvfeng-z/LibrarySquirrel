import { AsyncComponentLoader } from 'vue'

export interface ViewSlot {
  id: string // 唯一标识，如 "plugin-xxx-dashboard"
  name: string // 显示名称，如 "数据大屏"
  icon?: string // Element Plus 图标名
  component: AsyncComponentLoader // 动态导入组件
  order?: number // 排序权重
  props?: Record<string, unknown> // 传递给组件的额外属性
}
