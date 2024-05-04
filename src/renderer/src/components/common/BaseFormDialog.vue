<script setup lang="ts">
import { ref } from 'vue'

// props
const props = defineProps<{
  initialFormData: object
}>()

// 事件
const emits = defineEmits(['formDataChanged'])

// 变量
const formData = ref(props.initialFormData)

// 方法
// 用户输入改变时，发送formDataChanged事件
function handleFormDataChanged() {
  emits('formDataChanged', formData.value)
}
</script>

<template>
  <el-dialog class="dialog-form">
    <el-scrollbar class="dialog-form-scroll">
      <div class="dialog-form-scroll-form">
        <el-form v-model="formData" @input="handleFormDataChanged">
          <slot name="default" />
        </el-form>
      </div>
    </el-scrollbar>
  </el-dialog>
</template>

<style scoped>
.dialog-form-scroll-form {
  max-height: 90vh;
}
</style>
