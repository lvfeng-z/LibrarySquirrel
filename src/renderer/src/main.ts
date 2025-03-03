import App from './App.vue'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Element from 'element-plus'
import { elementIconRegister } from './plugins/elementIcon'
import 'element-plus/dist/index.css'
import './styles/el-tag-mimic.css'
import './styles/margin-box.css'
import './styles/rounded-borders.css'
import './styles/rounded-margin-box.css'
import './styles/scroll-text-left.css'
import './styles/scroll-text-center.css'
import './styles/z-axis-layers.css'
import clickOutSide from './directives/clickOutSide.ts'
import elSelectBottomed from './directives/elSelectBottomed.ts'
import elScrollbarBottomed from './directives/elScrollbarBottomed.ts'
import {
  removeParent,
  setChildren,
  setParent,
  updateChildren,
  updateChildrenSchedule,
  updateParent,
  updateParentSchedule
} from '@renderer/store/UseTaskStatusStore.ts'
import TaskProgressMapTreeDTO from '@renderer/model/main/dto/TaskProgressMapTreeDTO.ts'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'

const app = createApp(App)
const pinia = createPinia()
app.use(Element)
app.use(pinia)
// 全局注册 el-icon
elementIconRegister(app)
// 注册点击外部事件的自定义指令
app.directive('clickOutSide', clickOutSide)
// 注册el-select触底的的自定义指令
app.directive('elSelectBottomed', elSelectBottomed)
// 注册el-scrollbar触底的自定义指令
app.directive('elScrollbarBottomed', elScrollbarBottomed)
app.mount('#app')

window.electron.ipcRenderer.on('taskList-setChildren', (_event, taskList: TaskProgressMapTreeDTO[]) => {
  setChildren(taskList)
})

window.electron.ipcRenderer.on('taskList-updateChildren', (_event, taskList: TaskProgressMapTreeDTO[]) => {
  updateChildren(taskList)
})

window.electron.ipcRenderer.on('taskList-updateChildrenSchedule', (_event, scheduleDTOList: TaskScheduleDTO[]) => {
  updateChildrenSchedule(scheduleDTOList)
})

window.electron.ipcRenderer.on('taskList-setParent', (_event, taskList: TaskProgressMapTreeDTO[]) => {
  setParent(taskList)
})

window.electron.ipcRenderer.on('taskList-updateParent', (_event, taskList: TaskProgressMapTreeDTO[]) => {
  updateParent(taskList)
})

window.electron.ipcRenderer.on('taskList-updateParentSchedule', (_event, taskList: TaskScheduleDTO[]) => {
  updateParentSchedule(taskList)
})

window.electron.ipcRenderer.on('taskList-removeParent', (_event, ids: number[]) => {
  removeParent(ids)
})
