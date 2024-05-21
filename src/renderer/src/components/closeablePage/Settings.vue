<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { onBeforeMount, reactive, ref } from 'vue'
import lodash from 'lodash'

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
const activeName = [1] // 默认展开的折叠面板
const settings = ref({ workdir: '' }) // 设置
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
  <base-closeable-page>
    <el-scrollbar>
      <el-collapse v-model="activeName">
        <el-collapse-item title="工作目录" :name="1">
          <el-input v-model="settings.workdir"></el-input>
        </el-collapse-item>
      </el-collapse>
      <el-row>
        <el-col :span="6">
          <el-button type="primary" @click="saveSettings">保存</el-button>
          <el-button type="danger" @click="resetSettings">重置</el-button>
        </el-col>
      </el-row>
    </el-scrollbar>
  </base-closeable-page>
</template>

<style scoped></style>
