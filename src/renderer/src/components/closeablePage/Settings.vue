<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { onBeforeMount, reactive, ref } from 'vue'
import lodash from 'lodash'

//onBeforeMount
onBeforeMount(() => {
  loadSettings()
})

// 变量
const settings = ref({ workdir: '' })
const oldSettings = ref()
const apis = reactive({
  settingsGetSettings: window.api.settingsGetSettings,
  settingsSaveSettings: window.api.settingsSaveSettings,
  settingsResetSettings: window.api.settingsResetSettings
})

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
// 获取已更改的设置
function getChangedProperties(newVal: object, oldVal: object, root?: string) {
  const changedProperties: { path: string; value: unknown }[] = []
  for (const key of Object.keys(oldVal)) {
    root = root === undefined ? key : root + '.' + key
    if (Object.prototype.hasOwnProperty.call(newVal, key)) {
      if (typeof oldVal[key] === 'object') {
        getChangedProperties(newVal[key], oldVal[key], root)
      } else {
        if (oldVal[key] !== newVal[key]) {
          changedProperties.push({ path: root, value: newVal[key] })
        }
      }
    } else {
      changedProperties.push({ path: root, value: undefined })
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
    <el-collapse>
      <el-collapse-item :name="1">
        <el-input v-model="settings.workdir"></el-input>
      </el-collapse-item>
    </el-collapse>
    <el-button @click="saveSettings">保存</el-button>
    <el-button @click="resetSettings">重置</el-button>
  </base-closeable-page>
</template>

<style scoped></style>
