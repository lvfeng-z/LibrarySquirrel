import { createApp } from 'vue'
import App from './App.vue'
import Element from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/el-tag-mimic.css'
import './styles/margin-box.css'
import './styles/rounded-borders.css'
import './styles/rounded-margin-box.css'
import './styles/scroll-text.css'
import './styles/scroll-text-left.css'
import './styles/z-axis-layers.css'
import clickOutSide from './directives/clickOutSide.ts'
import scrollableText from './directives/scrollableText.ts'
import { elementIconRegister } from './plugins/elementIcon'
import scrollToBottom from './directives/scrollToBottom'

const app = createApp(App)
app.use(Element)
// 全局注册 el-icon
elementIconRegister(app)
// 注册溢出文字播放滚动动画的自定义指令
app.directive('scrollable', scrollableText)
// 注册点击外部事件的自定义指令
app.directive('clickOutSide', clickOutSide)
// 注册点击外部事件的自定义指令
app.directive('scrollToBottom', scrollToBottom)
app.mount('#app')
