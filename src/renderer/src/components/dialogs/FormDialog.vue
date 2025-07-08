<script setup lang="ts">
import { computed, nextTick, Ref, ref } from 'vue'
import DialogMode from '@renderer/model/util/DialogMode.ts'

// props
const props = defineProps<{
  mode: DialogMode
}>()

// model
// 表单数据
const formData = defineModel<object>('formData', { required: true })
// 弹窗开关
const state = defineModel<boolean>('state', { required: true })

// 事件
const emits = defineEmits(['saveButtonClicked', 'cancelButtonClicked'])

// 变量
// el-dialog组件实例
const dialogRef = ref()
// el-scrollbar内部容器的高度
const scrollbarWrapHeight: Ref<string> = ref('')
// 表单总开关
const formDisabled = computed(() => {
  return props.mode === DialogMode.VIEW
})
// 保存按钮开关
const saveButtonState = computed(() => {
  return props.mode !== DialogMode.VIEW
})

// 方法
// 处理保存按钮点击事件
function handleSaveButtonClicked() {
  emits('saveButtonClicked')
}
// 处理取消按钮点击事件
function handleCancelButtonClicked() {
  state.value = false
  emits('cancelButtonClicked')
}
// 开启对话框
function handleChangeState() {
  nextTick(() => {
    const dialog = dialogRef.value.$el.parentElement.parentElement
    const headerHeight = dialog.querySelector('.el-dialog__header').clientHeight
    const footerHeight = dialog.querySelector('.el-dialog__footer').clientHeight

    scrollbarWrapHeight.value = 'calc(90vh - ' + (headerHeight + footerHeight) + 'px)'
  })
}
</script>

<template>
  <el-dialog ref="dialogRef" v-model="state" center @open="handleChangeState">
    <template #header>
      <slot name="header" />
    </template>
    <el-scrollbar class="form-dialog-scrollbar">
      <el-form v-model="formData" class="form-dialog-form" :disabled="formDisabled">
        <slot name="form" />
      </el-form>
      <slot name="afterForm" />
    </el-scrollbar>
    <template #footer>
      <slot name="footer">
        <el-row>
          <el-col v-show="saveButtonState" :span="3">
            <el-button type="primary" @click="handleSaveButtonClicked">保存</el-button>
          </el-col>
          <el-col :span="3">
            <el-button @click="handleCancelButtonClicked">取消</el-button>
          </el-col>
        </el-row>
      </slot>
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
