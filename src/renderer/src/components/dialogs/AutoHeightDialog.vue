<script setup lang="ts">
import { nextTick, Ref, ref } from 'vue'

// model
// 弹窗开关
const state = defineModel<boolean>('state', { required: true })

// 变量
// el-dialog组件实例
const dialogRef = ref()
// el-scrollbar内部容器的高度
const scrollbarWrapHeight: Ref<string> = ref('')

// 方法
// 开启对话框
function handleChangeState() {
  nextTick(() => {
    const dialog = dialogRef.value.$el.parentElement.parentElement
    const headerHeight = dialog.querySelector('.el-dialog__header').clientHeight
    const footerHeight = dialog.querySelector('.el-dialog__footer').clientHeight

    // 减去header+footer+dialog的padding共计4个16px
    scrollbarWrapHeight.value = 'calc(90vh - ' + (headerHeight + footerHeight) + 'px - 16px - 16px - 16px - 16px)'
  })
}
</script>

<template>
  <el-dialog ref="dialogRef" v-model="state" center @open="handleChangeState">
    <template #header>
      <slot name="header" />
    </template>
    <el-scrollbar class="form-dialog-scrollbar">
      <slot />
    </el-scrollbar>
    <template #footer>
      <slot name="footer" />
    </template>
  </el-dialog>
</template>

<style scoped>
.form-dialog-scrollbar {
  padding: 0 10px 0 0;
  overflow: hidden;
}
.form-dialog-scrollbar > :deep(.el-scrollbar__wrap) {
  max-height: v-bind(scrollbarWrapHeight);
}
</style>
