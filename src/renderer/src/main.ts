import { createApp } from 'vue'
import App from './App.vue'
import Element from 'element-plus'
import 'element-plus/dist/index.css'
import './style/el-tag-mimic.css'
import './style/inset-center-box.css'
import './style/rounded-borders.css'
import './style/scroll-text.css'
import './style/z-axis-layers.css'
import scrollableTextDirective from './directive/scrollableTextDirective'
import { elementIconRegister } from './plugins/elementIcon'

const app = createApp(App)
app.use(Element)
// 全局注册 el-icon
elementIconRegister(app)
// 注册溢出文字播放滚动动画的自定义指令
app.directive('scrollable', scrollableTextDirective)
app.mount('#app')
