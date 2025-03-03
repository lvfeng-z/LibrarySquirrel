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
import TaskProgressMapTreeDTO from '@renderer/model/main/dto/TaskProgressMapTreeDTO.ts'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'
import { removeTask, setTask, updateTask, updateTaskSchedule } from '@renderer/store/UseTaskStore.ts'
import { removeParentTask, setParentTask, updateParentTask, updateParentTaskSchedule } from '@renderer/store/UseParentTaskStore.ts'
import TaskProgressDTO from '@renderer/model/main/dto/TaskProgressDTO.ts'

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

window.electron.ipcRenderer.on('task-setTask', (_event, taskList: TaskProgressDTO[]) => {
  setTask(taskList)
})

window.electron.ipcRenderer.on('task-updateTask', (_event, taskList: TaskProgressDTO[]) => {
  updateTask(taskList)
})

window.electron.ipcRenderer.on('task-updateTaskSchedule', (_event, scheduleDTOList: TaskScheduleDTO[]) => {
  updateTaskSchedule(scheduleDTOList)
})

window.electron.ipcRenderer.on('task-removeTask', (_event, ids: number[]) => {
  removeTask(ids)
})

window.electron.ipcRenderer.on('parentTask-setParentTask', (_event, taskList: TaskProgressMapTreeDTO[]) => {
  setParentTask(taskList)
})

window.electron.ipcRenderer.on('parentTask-updateParentTask', (_event, taskList: TaskProgressMapTreeDTO[]) => {
  updateParentTask(taskList)
})

window.electron.ipcRenderer.on('parentTask-updateParentTaskSchedule', (_event, taskList: TaskScheduleDTO[]) => {
  updateParentTaskSchedule(taskList)
})

window.electron.ipcRenderer.on('parentTask-removeParentTask', (_event, ids: number[]) => {
  removeParentTask(ids)
})
