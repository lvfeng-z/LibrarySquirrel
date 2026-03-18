import App from './App.vue'
import { createApp } from 'vue'
import * as vue from 'vue'
import { createPinia } from 'pinia'
import Element from 'element-plus'
import { elementIconRegister } from './plugins/elementIcon'
import router from './router'
import 'element-plus/dist/index.css'
import './styles/el-tag-mimic.css'
import './styles/rounded-borders.css'
import './styles/scroll-text-left.css'
import './styles/scroll-text-center.css'
import './styles/z-axis-layers.css'
import clickOutSide from './directives/clickOutSide.ts'
import elSelectBottomed from './directives/elSelectBottomed.ts'
import elScrollbarBottomed from './directives/elScrollbarBottomed.ts'
import { iniListener } from '@renderer/MainIpcListener.ts'
import { initBuiltinMenus } from './composables/useBuiltinMenus.ts'
import { initSlotSyncListener } from './composables/useSlotSyncListener.ts'
import { setRouterInstance } from './store/SlotRegistryStore.ts'

const app = createApp(App)
const pinia = createPinia()
app.use(Element)
app.use(pinia)
app.use(router)
// 全局注册 el-icon
elementIconRegister(app)
// 注册点击外部事件的自定义指令
app.directive('clickOutSide', clickOutSide)
// 注册el-select触底的的自定义指令
app.directive('elSelectBottomed', elSelectBottomed)
// 注册el-scrollbar触底的自定义指令
app.directive('elScrollbarBottomed', elScrollbarBottomed)

// 暴露 router 实例到全局（在 initBuiltinMenus 之前）
app.config.globalProperties.$router = router
window['__vueRouter__'] = router

// 设置 router 实例到 store（在 router 初始化后）
setRouterInstance(router)

app.mount('#app')

// 关键：暴露给插件使用
window['vue'] = vue // 视情况而定
window['element-plus'] = Element

// 初始化内置菜单（在 pinia store 初始化之后）
initBuiltinMenus()

// 初始化插槽同步监听器（监听主进程发来的插槽注册消息）
initSlotSyncListener()

iniListener()
