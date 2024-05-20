<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { onMounted, reactive, ref } from 'vue'
//onMounted
onMounted(() => {
  getSettings()
})

// 变量
const settings = ref()
const apis = reactive({
  settingsServiceGetSettings: window.api.settingsServiceGetSettings
})

// 方法
function getSettings() {
  settings.value = apis.settingsServiceGetWorkdir()
}
</script>

<template>
  <base-closeable-page>
    <el-collapse>
      <el-collapse-item :name="1">
        <el-input v-model="settings.workdir"></el-input>
      </el-collapse-item>
    </el-collapse>
  </base-closeable-page>
</template>

<style scoped>

</style>
