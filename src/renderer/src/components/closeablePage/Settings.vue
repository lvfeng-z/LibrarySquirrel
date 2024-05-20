<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { onBeforeMount, reactive, ref } from 'vue'
import lodash from 'lodash'
//onBeforeMount
onBeforeMount(() => {
  getSettings()
})

// 变量
const settings = ref()
const oldSettings = ref()
const apis = reactive({
  settingsGetSettings: window.api.settingsGetSettings,
  settingsSaveSettings: window.api.settingsSaveSettings
})

// 方法
function getSettings() {
  apis.settingsGetSettings().then((response) => {
    settings.value = response
    oldSettings.value = lodash.cloneDeep(response)
  })
}
function saveSettings() {
  apis.settingsSaveSettings()
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
  </base-closeable-page>
</template>

<style scoped>

</style>
