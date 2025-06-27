<script setup lang="ts">
import Electron from 'electron'
import BaseSubpage from './BaseSubpage.vue'
import { onBeforeMount, reactive, Ref, ref } from 'vue'
import lodash from 'lodash'
import { emptySettings, Settings } from '../../model/util/Settings'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import { ElMessage, ElMessageBox } from 'element-plus'
import ApiResponse from '@renderer/model/util/ApiResponse.ts'
import ResFileNameFormatEnum from '@renderer/constants/ResFileNameFormatEnum.ts'
import { PageState } from '@renderer/constants/Subpage.ts'

// props
const props = defineProps<{ state: PageState }>()

// onBeforeMount
onBeforeMount(() => {
  props.state.setBeforeClose(checkChangeSaved)
  loadSettings()
})

// model
const tourStates: Ref<{ workdir: boolean }> = defineModel<{ workdir: boolean }>('tourStates', { default: { workdir: false } })

// 变量
const apis = reactive({
  dirSelect: window.api.dirSelect,
  settingsGetSettings: window.api.settingsGetSettings,
  settingsSaveSettings: window.api.settingsSaveSettings,
  settingsResetSettings: window.api.settingsResetSettings
}) // 接口
// 工作目录输入组件实例
const workdirInput = ref()
// 主要容器的实例
const containerRef = ref()
// 作品文件名称命名格式输入组件实例
const worksSettingsFileNameFormatInput = ref()
// 设置
const settings: Ref<Settings> = ref(emptySettings)
let oldSettings: Settings = emptySettings // 原设置
// 作品文件名称命名格式对话框开关
const worksSettingsFileNameFormatDialogState: Ref<boolean> = ref(false)

// 方法
// 加载设置
async function loadSettings() {
  const response = await apis.settingsGetSettings()
  if (ApiUtil.check(response)) {
    const data = ApiUtil.data<Settings>(response)
    settings.value = IsNullish(data) ? emptySettings : data
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
  if (NotNullish(settings.value)) {
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
  const response = await apis.dirSelect(false, true)
  if (ApiUtil.check(response)) {
    const dirSelectResult = ApiUtil.data(response) as Electron.OpenDialogReturnValue
    if (!dirSelectResult.canceled && ArrayNotEmpty(dirSelectResult.filePaths) && NotNullish(settings.value)) {
      settings.value.workdir = dirSelectResult.filePaths[0]
    }
  }
}
// 在关闭前检查设置是否已经更改
async function checkChangeSaved(): Promise<boolean> {
  if (!lodash.isEqual(settings.value, oldSettings)) {
    return new Promise<boolean>((resolve) => {
      ElMessageBox.confirm('是否保存更改?', '更改未保存', {
        confirmButtonText: '是',
        cancelButtonText: '否',
        type: 'warning'
      })
        .then(() => {
          saveSettings()
          resolve(true)
        })
        .catch(() => {
          resolve(true)
        })
    })
  }
  return true
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
// 作品-添加命名标识符
function insertFormatToken(element: ResFileNameFormatEnum) {
  const inputElement = worksSettingsFileNameFormatInput.value.input
  if (inputElement) {
    const startPos = inputElement.selectionStart // 光标起始位置
    const endPos = inputElement.selectionEnd // 光标结束位置

    // 插入字符串到光标位置
    settings.value.worksSettings.fileNameFormat =
      settings.value.worksSettings.fileNameFormat.slice(0, startPos) +
      element.token +
      settings.value.worksSettings.fileNameFormat.slice(endPos)

    // 设置新的光标位置
    const newCursorPos = startPos + element.token.length
    inputElement.setSelectionRange(newCursorPos, newCursorPos)
    inputElement.focus() // 确保输入框保持焦点
  }
}
</script>

<template>
  <base-subpage>
    <template #default>
      <el-container class="settings-container">
        <el-main style="display: flex; flex-direction: row; padding: 0">
          <el-anchor :container="containerRef?.parentElement?.parentElement" direction="vertical" type="default" :offset="30">
            <el-anchor-link href="#basicSettings" title="基本设置" />
            <el-anchor-link href="#downloadSettings" title="下载" />
            <el-anchor-link href="#worksSettings" title="作品" />
            <el-anchor-link href="#otherSettings" title="其他" />
          </el-anchor>
          <el-scrollbar style="margin-left: 30px; flex-grow: 1">
            <div ref="containerRef" style="margin-right: 10px">
              <div id="basicSettings">
                <el-text class="mx-1" size="large">基本设置</el-text>
                <el-divider content-position="left" border-style="dotted"><el-text>工作目录</el-text></el-divider>
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
                <el-divider content-position="left" border-style="dotted"><el-text>并行下载数</el-text></el-divider>
                <el-input-number
                  v-model="settings.importSettings.maxParallelImport"
                  :max="20"
                  :min="1"
                  controls-position="right"
                ></el-input-number>
                <el-divider />
              </div>
              <div id="worksSettings">
                <el-text size="large">作品</el-text>
                <el-divider content-position="left" border-style="dotted"><el-text>作品的文件命名格式</el-text></el-divider>
                <el-row class="works-settings-file-name-format-button">
                  <el-button @click="insertFormatToken(ResFileNameFormatEnum.AUTHOR)">
                    {{ ResFileNameFormatEnum.AUTHOR.name }}
                  </el-button>
                  <el-button @click="insertFormatToken(ResFileNameFormatEnum.LOCAL_AUTHOR_NAME)">
                    {{ ResFileNameFormatEnum.LOCAL_AUTHOR_NAME.name }}
                  </el-button>
                  <el-button @click="insertFormatToken(ResFileNameFormatEnum.SITE_AUTHOR_NAME)">
                    {{ ResFileNameFormatEnum.SITE_AUTHOR_NAME.name }}
                  </el-button>
                  <el-button @click="insertFormatToken(ResFileNameFormatEnum.SITE_AUTHOR_ID)">
                    {{ ResFileNameFormatEnum.SITE_AUTHOR_ID.name }}
                  </el-button>
                  <el-button @click="insertFormatToken(ResFileNameFormatEnum.SITE_WORKS_NAME)">
                    {{ ResFileNameFormatEnum.SITE_WORKS_NAME.name }}
                  </el-button>
                  <el-button @click="insertFormatToken(ResFileNameFormatEnum.SITE_WORKS_ID)">
                    {{ ResFileNameFormatEnum.SITE_WORKS_ID.name }}
                  </el-button>
                  <el-button @click="insertFormatToken(ResFileNameFormatEnum.DESCRIPTION)">
                    {{ ResFileNameFormatEnum.DESCRIPTION.name }}
                  </el-button>
                  <el-tooltip :show-after="850">
                    <template #content>查看更多选项</template>
                    <el-button @click="worksSettingsFileNameFormatDialogState = true">...</el-button>
                  </el-tooltip>
                </el-row>
                <el-input ref="worksSettingsFileNameFormatInput" v-model="settings.worksSettings.fileNameFormat"></el-input>
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
    </template>
    <template #dialog>
      <el-dialog v-model="worksSettingsFileNameFormatDialogState">
        <div>
          <el-button class="works-settings-file-name-format-button" @click="insertFormatToken(ResFileNameFormatEnum.AUTHOR)">
            {{ ResFileNameFormatEnum.AUTHOR.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.LOCAL_AUTHOR_NAME)"
          >
            {{ ResFileNameFormatEnum.LOCAL_AUTHOR_NAME.name }}
          </el-button>
          <el-button class="works-settings-file-name-format-button" @click="insertFormatToken(ResFileNameFormatEnum.SITE_AUTHOR_NAME)">
            {{ ResFileNameFormatEnum.SITE_AUTHOR_NAME.name }}
          </el-button>
          <el-button class="works-settings-file-name-format-button" @click="insertFormatToken(ResFileNameFormatEnum.SITE_AUTHOR_ID)">
            {{ ResFileNameFormatEnum.SITE_AUTHOR_ID.name }}
          </el-button>
          <el-button class="works-settings-file-name-format-button" @click="insertFormatToken(ResFileNameFormatEnum.SITE_WORKS_NAME)">
            {{ ResFileNameFormatEnum.SITE_WORKS_NAME.name }}
          </el-button>
          <el-button class="works-settings-file-name-format-button" @click="insertFormatToken(ResFileNameFormatEnum.SITE_WORKS_ID)">
            {{ ResFileNameFormatEnum.SITE_WORKS_ID.name }}
          </el-button>
          <el-button class="works-settings-file-name-format-button" @click="insertFormatToken(ResFileNameFormatEnum.DESCRIPTION)">
            {{ ResFileNameFormatEnum.DESCRIPTION.name }}
          </el-button>
          <el-button class="works-settings-file-name-format-button" @click="insertFormatToken(ResFileNameFormatEnum.UPLOAD_TIME_YEAR)">
            {{ ResFileNameFormatEnum.UPLOAD_TIME_YEAR.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.UPLOAD_TIME_MONTH)"
          >
            {{ ResFileNameFormatEnum.UPLOAD_TIME_MONTH.name }}
          </el-button>
          <el-button class="works-settings-file-name-format-button" @click="insertFormatToken(ResFileNameFormatEnum.UPLOAD_TIME_DAY)">
            {{ ResFileNameFormatEnum.UPLOAD_TIME_DAY.name }}
          </el-button>
          <el-button class="works-settings-file-name-format-button" @click="insertFormatToken(ResFileNameFormatEnum.UPLOAD_TIME_HOUR)">
            {{ ResFileNameFormatEnum.UPLOAD_TIME_HOUR.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.UPLOAD_TIME_MINUTE)"
          >
            {{ ResFileNameFormatEnum.UPLOAD_TIME_MINUTE.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.UPLOAD_TIME_SECOND)"
          >
            {{ ResFileNameFormatEnum.UPLOAD_TIME_SECOND.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.DOWNLOAD_TIME_YEAR)"
          >
            {{ ResFileNameFormatEnum.DOWNLOAD_TIME_YEAR.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.DOWNLOAD_TIME_MONTH)"
          >
            {{ ResFileNameFormatEnum.DOWNLOAD_TIME_MONTH.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.DOWNLOAD_TIME_DAY)"
          >
            {{ ResFileNameFormatEnum.DOWNLOAD_TIME_DAY.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.DOWNLOAD_TIME_HOUR)"
          >
            {{ ResFileNameFormatEnum.DOWNLOAD_TIME_HOUR.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.DOWNLOAD_TIME_MINUTE)"
          >
            {{ ResFileNameFormatEnum.DOWNLOAD_TIME_MINUTE.name }}
          </el-button>
          <el-button
            class="works-settings-file-name-format-button"
            @click="insertFormatToken(ResFileNameFormatEnum.DOWNLOAD_TIME_SECOND)"
          >
            {{ ResFileNameFormatEnum.DOWNLOAD_TIME_SECOND.name }}
          </el-button>
        </div>
        <el-input ref="worksSettingsFileNameFormatInput" v-model="settings.worksSettings.fileNameFormat"></el-input>
      </el-dialog>
    </template>
  </base-subpage>
</template>

<style scoped></style>
<style>
.settings-container {
  border-radius: 6px;
  display: flex;
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  padding: 5px;
  margin: 5px;
}
.works-settings-file-name-format-button {
  margin-bottom: 10px;
}
.el-popper.is-customized {
  background: var(--el-color-warning-light-7);
}

.el-popper.is-customized .el-popper__arrow::before {
  background: var(--el-color-warning-light-7);
}
</style>
