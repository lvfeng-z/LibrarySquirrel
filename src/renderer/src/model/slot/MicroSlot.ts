export interface MicroSlot {
  id: string
  position: 'topbar' | 'statusbar' | 'toolbar'
  component: () => Promise<unknown>
  props?: Record<string, unknown>
}
