export interface EmbedSlot {
  id: string
  position: 'topbar' | 'statusbar' | 'toolbar'
  component: () => Promise<any>
  props?: Record<string, any>
  order?: number
}
