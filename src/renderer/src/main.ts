import { createApp } from 'vue'
import App from './App.vue'
import Element from 'element-plus'
import 'element-plus/dist/index.css'
import { elementIconRegister } from './plugins/elementIcon'

const app = createApp(App)
app.use(Element)
// 全局注册 el-icon
elementIconRegister(app)
app.mount('#app')
