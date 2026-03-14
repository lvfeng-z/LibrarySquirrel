<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
import * as electron from 'electron'
import DynamicSideMenu from '@renderer/components/slot/DynamicSideMenu.vue'
import ViewSlotRenderer from '@renderer/components/slot/ViewSlotRenderer.vue'
import { Close } from '@element-plus/icons-vue'
import ApiUtil from './utils/ApiUtil'
import ExplainPath from './components/dialogs/ExplainPath.vue'
import TransactionTest from './test/transaction-test.vue'
import NotificationList from '@renderer/components/oneOff/NotificationList.vue'
import { Settings as SettingsEntity } from '@renderer/model/util/Settings.ts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { askGotoPage, gotoPage } from '@renderer/utils/PageUtil.ts'
import { PageEnum } from '@renderer/constants/PageState.ts'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore.ts'
import TaskQueueResourceReplaceConfirmDialog from '@renderer/components/dialogs/TaskQueueResourceReplaceConfirmDialog.vue'
import { useTourStatesStore } from '@renderer/store/UseTourStatesStore.ts'
import { useSlotRegistryStore } from '@renderer/store/SlotRegistryStore'
import { isBlank } from '@shared/util/StringUtil.ts'

// onMounted
onMounted(async () => {
  if (mainAreaRef.value) {
    resizeObserver.observe(mainAreaRef.value)
  }
  window.addEventListener('keyup', handleKeyUp)

  // 首次使用软件的向导
  const response = await window.api.settingsGetSettings()
  if (ApiUtil.check(response)) {
    const data = ApiUtil.data<SettingsEntity>(response)
    const workDirIsBlank = isBlank(data?.workdir)
    const askSetWorkDir = () =>
      askGotoPage({
        page: PageEnum.Settings,
        title: '请设置工作目录',
        content: 'LibrarySquirrel需要工作目录才能正常使用',
        options: {
          confirmButtonText: '去设置',
          cancelButtonText: '取消',
          type: 'warning',
          showClose: false
        },
        extraData: true
      })
    if (!data?.tour.firstTimeTourPassed) {
      ElMessageBox.confirm('在使用LibrarySquirrel之前，建议先查看向导', '', {
        confirmButtonText: '前往查看',
        cancelButtonText: '取消'
      })
        .then(async () => {
          await gotoPage(PageEnum.Guide)
          await window.api.settingsSaveSettings([{ path: 'tour.firstTimeTourPassed', value: true }])
          await usePageStatesStore().waitPage(usePageStatesStore().pageStates.mainPage)
          if (workDirIsBlank) {
            askSetWorkDir()
          }
        })
        .catch(async () => {
          useTourStatesStore()
            .tourStates.startGuideTour()
            .then(() => {
              if (workDirIsBlank) {
                askSetWorkDir()
              }
            })
          await window.api.settingsSaveSettings([{ path: 'tour.firstTimeTourPassed', value: true }])
        })
    } else if (workDirIsBlank) {
      askSetWorkDir()
    }
  } else {
    ElMessage({
      message: '获取设置失败',
      type: 'error'
    })
  }
})

// onBeforeUnmount
onBeforeUnmount(() => {
  window.removeEventListener('keyup', handleKeyUp)
})

// 变量
const mainAreaRef = ref<HTMLElement>()
const pageStatesStore = usePageStatesStore()
const slotStore = useSlotRegistryStore()
const notificationListState = ref(false)

// IpcRenderer相关
// 路径解释
const showExplainPath = ref(false) // 解释路径对话框的开关
const pathWaitingExplain = ref('') // 需要解释含义的路径
// 资源替换确认
const resourceReplaceConfirmState = ref(false)
const resourceReplaceConfirmList = ref<{ taskId: number; msg: string }[]>([])

// test
const showTestDialog = ref(false)

// 监听工作区大小变化
const resizeObserver = new ResizeObserver(() => {
  // 可以在这里处理主区域大小变化
})

// 判断是否需要显示关闭按钮
const showCloseButton = computed(() => {
  return slotStore.activeViewId !== null && slotStore.activeViewId !== 'mainPage'
})

// 监听esc键
function handleKeyUp(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleCloseCurrentView()
  }
}

// 关闭当前视图
async function handleCloseCurrentView() {
  await pageStatesStore.backToMainPage()
}

// 监听IpcRenderer
window.electron.ipcRenderer.on('explain-path-request', (_event: electron.IpcRendererEvent, dir) => {
  showExplainPath.value = true
  pathWaitingExplain.value = dir
})
window.electron.ipcRenderer.on(
  'task-queue-resource-replace-confirm',
  (_event: electron.IpcRendererEvent, config: { taskId: number; msg: string }) => {
    resourceReplaceConfirmState.value = true
    resourceReplaceConfirmList.value.push(config)
  }
)
</script>

<template>
  <div class="ui">
    <!-- 关闭按钮 -->
    <div
      :class="{
        'close-subpage-button': true,
        'z-layer-5': true,
        'close-subpage-button-hide': !showCloseButton
      }"
      @click="handleCloseCurrentView"
    >
      <Close class="close-subpage-button-icon" />
    </div>

    <el-container>
      <!-- 侧边栏 -->
      <el-aside class="main-page-sidebar z-layer-4" width="auto">
        <!-- 为了不被TagManage中的SearchToolbar的3层z轴遮挡，此处为4层z轴 -->
        <dynamic-side-menu class="aside-side-menu" width="160px" fold-width="64px" />
      </el-aside>

      <!-- 主区域 - 统一视图渲染 -->
      <el-main ref="mainAreaRef" style="padding: 0">
        <view-slot-renderer />
      </el-main>
    </el-container>

    <!-- 其他弹窗组件保留 -->
    <notification-list class="main-background-task z-layer-3" :state="notificationListState" />
    <explain-path v-model:state="showExplainPath" width="80%" :string-to-explain="pathWaitingExplain" :close-on-click-modal="false" />
    <task-queue-resource-replace-confirm-dialog
      v-model:state="resourceReplaceConfirmState"
      v-model:confirm-list="resourceReplaceConfirmList"
    />
    <transaction-test v-model="showTestDialog"></transaction-test>
    <el-tour
      v-model="useTourStatesStore().tourStates.guideMenuTour"
      :scroll-into-view-options="true"
      :mask="false"
      @finish="useTourStatesStore().tourStates.getCallback('guideMenuTour')"
    >
      <el-tour-step title="向导" description="后续可以点击这里进入向导页面" placement="right"></el-tour-step>
    </el-tour>
    <el-tour
      v-model="useTourStatesStore().tourStates.taskMenuTour"
      :scroll-into-view-options="true"
      @finish="useTourStatesStore().tourStates.getCallback('taskMenuTour')"
    >
      <el-tour-step title="任务向导" description="点击这里进入任务页面"></el-tour-step>
    </el-tour>
  </div>
</template>

<style scoped>
.ui {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  background-color: #fafafa;
  --side-menu-background-color: #ebf0f5;
}

.close-subpage-button {
  display: flex;
  justify-content: end;
  align-items: end;
  background-color: var(--el-color-danger);
  cursor: pointer;
  position: absolute;
  left: -65px;
  top: -65px;
  width: 100px;
  height: 100px;
  pointer-events: visibleFill;
  clip-path: circle(50px);
  transition: 0.3s;
}

.close-subpage-button:hover {
  left: -55px;
  top: -55px;
  background-color: var(--el-color-danger-light-3);
}

.close-subpage-button-hide {
  left: -100px;
  top: -100px;
}

.close-subpage-button-icon {
  width: 25%;
  height: 25%;
  color: #fafafa;
  margin-right: 12%;
  margin-bottom: 12%;
}

.main-background-task {
  align-self: center;
  height: 85%;
}

.aside-side-menu {
  height: 100%;
}

:deep(.main-page-sidebar) {
  overflow: visible;
}
</style>
