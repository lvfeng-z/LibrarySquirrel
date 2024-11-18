<script setup lang="ts">
import BaseSubpage from './BaseSubpage.vue'
import { onBeforeMount, reactive, Ref, ref, UnwrapRef } from 'vue'
import lodash from 'lodash'
import { Settings } from '../../model/util/Settings'

//onBeforeMount
onBeforeMount(() => {
  loadSettings()
})

// 变量
const apis = reactive({
  settingsGetSettings: window.api.settingsGetSettings,
  settingsSaveSettings: window.api.settingsSaveSettings,
  settingsResetSettings: window.api.settingsResetSettings
}) // 接口
// 设置
const settings: Ref<UnwrapRef<Settings>> = ref({
  initialized: true,
  programVersion: '',
  workdir: '',
  importSettings: {
    maxParallelImport: 1
  }
})
const oldSettings = ref() // 原设置

// 方法
// 加载设置
async function loadSettings() {
  settings.value = await apis.settingsGetSettings()
  oldSettings.value = lodash.cloneDeep(settings.value)
}
// 保存设置
function saveSettings() {
  const a = getChangedProperties(settings.value, oldSettings.value)
  apis.settingsSaveSettings(a)
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
// 所有设置重置为默认
function resetSettings() {
  apis.settingsResetSettings()
}
</script>

<template>
  <base-subpage>
    <el-scrollbar>
      <el-descriptions direction="vertical" :column="1">
        <el-descriptions-item label="工作目录">
          <el-input v-model="settings.workdir"></el-input>
        </el-descriptions-item>
        <el-descriptions-item label="最大并发下载数">
          <el-input-number v-model="settings.importSettings.maxParallelImport"></el-input-number>
        </el-descriptions-item>
      </el-descriptions>
      <el-row>
        <el-col :span="6">
          <el-button type="primary" @click="saveSettings">保存</el-button>
          <el-button type="danger" @click="resetSettings">重置</el-button>
        </el-col>
      </el-row>
    </el-scrollbar>
  </base-subpage>
</template>

<style scoped></style>
