<script setup lang="ts">
import BaseSubpage from './BaseSubpage.vue'
import { onBeforeMount, reactive, Ref, ref, UnwrapRef } from 'vue'
import lodash from 'lodash'
import { emptySettings, Settings } from '../../model/util/Settings'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import { arrayNotEmpty, isNullish, notNullish } from '@renderer/utils/CommonUtil.ts'
import { ElMessage, ElMessageBox } from 'element-plus'
import ApiResponse from '@renderer/model/util/ApiResponse.ts'

// onBeforeMount
onBeforeMount(() => {
  loadSettings()
})

// model
const tourStates: Ref<UnwrapRef<{ workdir: boolean }>> = defineModel('tourStates', { default: { workdir: false } })

// 变量
const apis = reactive({
  dirSelect: window.api.dirSelect,
  settingsGetSettings: window.api.settingsGetSettings,
  settingsSaveSettings: window.api.settingsSaveSettings,
  settingsResetSettings: window.api.settingsResetSettings
}) // 接口
// 工作目录输入组件实例
const workdirInput = ref()
// 工作目录输入组件实例
const containerRef = ref()
// 设置
const settings: Ref<UnwrapRef<Settings>> = ref(emptySettings)
let oldSettings: Settings = emptySettings // 原设置

// 方法
// 加载设置
async function loadSettings() {
  const response = await apis.settingsGetSettings()
  if (ApiUtil.check(response)) {
    const data = ApiUtil.data<Settings>(response)
    settings.value = isNullish(data) ? emptySettings : data
    oldSettings = lodash.cloneDeep(settings.value)
  } else {
    ElMessage({
      message: '获取设置失败',
      type: 'error'
    })
  }
}
// 保存或重置设置
async function saveOrReset(fun: (arg?: unknown) => Promise<ApiResponse>) {
  if (notNullish(settings.value)) {
    const changed = getChangedProperties(settings.value, oldSettings)
    const response = await fun(changed)
    if (ApiUtil.check(response)) {
      const succeed = ApiUtil.data<boolean>(response)
      if (succeed) {
        ElMessage({
          message: '修改成功',
          type: 'success'
        })
      } else {
        ElMessage({
          message: '修改失败',
          type: 'error'
        })
      }
    }
  }
}
// 保存设置
async function saveSettings() {
  return saveOrReset(apis.settingsSaveSettings).then(() => loadSettings())
}
// 所有设置重置为默认
async function resetSettings() {
  const confirm = await askBeforeReset()
  if (confirm) {
    return saveOrReset(apis.settingsResetSettings).then(() => loadSettings())
  }
}
// 递归获取已更改的设置
function getChangedProperties(newVal: object, oldVal: object, root?: string) {
  let changedProperties: { path: string; value: unknown }[] = []
  for (const key of Object.keys(oldVal)) {
    const newRoot = root === undefined ? key : root + '.' + key
    if (Object.prototype.hasOwnProperty.call(newVal, key)) {
      if (typeof oldVal[key] === 'object') {
        const children = getChangedProperties(newVal[key], oldVal[key], newRoot)
        changedProperties = [...changedProperties, ...children]
      } else {
        if (oldVal[key] !== newVal[key]) {
          changedProperties.push({ path: newRoot, value: newVal[key] })
        }
      }
    } else {
      changedProperties.push({ path: newRoot, value: undefined })
    }
  }

  return changedProperties
}
// 选择目录
async function selectDir() {
  const response = await apis.dirSelect(false)
  if (ApiUtil.check(response)) {
    const dirSelectResult = ApiUtil.data(response) as Electron.OpenDialogReturnValue
    if (!dirSelectResult.canceled && arrayNotEmpty(dirSelectResult.filePaths) && notNullish(settings.value)) {
      settings.value.workdir = dirSelectResult.filePaths[0]
    }
  }
}
// 在关闭前检查设置是否已经更改
async function checkChangeSaved() {
  if (!lodash.isEqual(settings.value, oldSettings)) {
    return new Promise<void>((resolve) => {
      ElMessageBox.confirm('是否保存更改?', '更改未保存', {
        confirmButtonText: '是',
        cancelButtonText: '否',
        type: 'warning'
      })
        .then(() => {
          saveSettings()
          resolve()
        })
        .catch(() => {
          resolve()
        })
    })
  }
}
// 重置前询问
async function askBeforeReset(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    ElMessageBox.confirm('所有设置将重置到默认状态', '是否重置?', {
      confirmButtonText: '是',
      cancelButtonText: '否',
      type: 'warning'
    })
      .then(() => {
        resolve(true)
      })
      .catch(() => {
        ElMessage({
          message: '取消重置',
          type: 'warning'
        })
        resolve(false)
      })
  })
}
</script>

<template>
  <base-subpage :before-close="checkChangeSaved">
    <el-container style="height: 100%">
      <el-main style="display: flex; flex-direction: row; padding: 0">
        <el-anchor :container="containerRef?.parentElement?.parentElement" direction="vertical" type="default" :offset="30">
          <el-anchor-link href="#basicSettings" title="基本设置" />
          <el-anchor-link href="#downloadSettings" title="下载" />
          <el-anchor-link href="#otherSettings" title="其他" />
        </el-anchor>
        <el-scrollbar style="margin-left: 30px; flex-grow: 1">
          <div ref="containerRef" style="margin-right: 10px">
            <div id="basicSettings">
              <el-text class="mx-1" size="large">基本设置</el-text>
              <el-divider content-position="left" border-style="dotted">工作目录</el-divider>
              <el-tooltip
                placement="top"
                effect="customized"
                content="LibrarySquirrel所管理的所有资源都会被保存到这个目录下，请确保这个目录有足够的空间，并且非必要的情况下不要更改此项"
              >
                <el-row>
                  <el-col :span="22">
                    <el-input ref="workdirInput" v-model="settings.workdir"></el-input>
                  </el-col>
                  <el-col :span="1">
                    <el-button icon="FolderOpened" @click="selectDir"></el-button>
                  </el-col>
                  <el-col :span="1">
                    <el-button type="danger" icon="RefreshLeft" @click="settings.workdir = oldSettings.workdir"></el-button>
                  </el-col>
                </el-row>
              </el-tooltip>
              <el-divider />
            </div>
            <div id="downloadSettings">
              <el-text class="mx-1" size="large">下载</el-text>
              <el-divider content-position="left" border-style="dotted">最大同时下载数量</el-divider>
              <el-input-number v-model="settings.importSettings.maxParallelImport"></el-input-number>
              <el-divider />
            </div>
            <div id="otherSettings">
              <el-text class="mx-1" size="large">其他</el-text>
              <el-divider />
            </div>
          </div>
        </el-scrollbar>
      </el-main>
      <el-footer height="32px">
        <el-row>
          <el-col :span="6">
            <el-button type="primary" @click="saveSettings">保存</el-button>
            <el-button type="danger" @click="resetSettings">默认设置</el-button>
          </el-col>
        </el-row>
      </el-footer>
    </el-container>
    <el-tour v-model="tourStates.workdir" :scroll-into-view-options="true">
      <el-tour-step :target="workdirInput?.$el" title="工作目录" description="在这里设置工作目录"></el-tour-step>
    </el-tour>
  </base-subpage>
</template>

<style scoped></style>
<style>
.el-popper.is-customized {
  background: var(--el-color-warning-light-7);
}

.el-popper.is-customized .el-popper__arrow::before {
  background: var(--el-color-warning-light-7);
}
</style>
