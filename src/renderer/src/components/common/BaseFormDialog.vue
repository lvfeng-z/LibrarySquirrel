<script setup lang="ts">
import { ref } from 'vue'

// 事件
const emits = defineEmits(['paramsChanged'])

// 变量
const formData = ref({})

// 方法
// 用户输入改变时，发送paramsChanged事件
function handleParamsChanged() {
  emits('paramsChanged', formData.value)
}
</script>

<template>
  <el-dialog class="dialog-form">
    <el-scrollbar class="dialog-form-rows">
      <el-form v-model="formData" @input="handleParamsChanged">
        <slot name="default" />
      </el-form>
    </el-scrollbar>
  </el-dialog>
</template>

<style scoped>
.dialog-form {
  width: 100%;
  position: relative;
}
.dialog-form-rows {
  flex-direction: column;
  width: 100%;
}
</style>
