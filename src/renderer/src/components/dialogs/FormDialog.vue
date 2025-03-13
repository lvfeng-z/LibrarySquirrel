<script setup lang="ts">
import { computed, nextTick, Ref, ref, UnwrapRef } from 'vue'
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
// el-scrollbar组件实例
const scrollbarRef = ref()
// el-scrollbar的高度
const scrollContentHeight: Ref<UnwrapRef<number>> = ref(0)
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
    const dialog = scrollbarRef.value.$el.parentElement.parentElement
    const headerHeight = dialog.querySelector('.el-dialog__header').clientHeight
    const footerHeight = dialog.querySelector('.el-dialog__footer').clientHeight

    scrollContentHeight.value = headerHeight + footerHeight
  })
}
</script>

<template>
  <el-dialog v-model="state" center @open="handleChangeState">
    <template #header>
      <slot name="header" />
    </template>
    <el-scrollbar ref="scrollbarRef">
      <el-form
        v-model="formData"
        :disabled="formDisabled"
        :style="{ maxHeight: 'calc(90vh - ' + scrollContentHeight + 'px)', marginRight: '10px' }"
      >
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

<style scoped></style>
