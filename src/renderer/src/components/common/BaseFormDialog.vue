<script setup lang="ts">
import { nextTick, onMounted, Ref, ref, UnwrapRef } from 'vue'
import DialogMode from '../../model/util/DialogMode'

// props
const props = defineProps<{
  mode: DialogMode
  header?: string // 标题
}>()

// model
// 表单数据
const formData = defineModel<object | undefined>('formData', {
  default: () => undefined
})
// 弹窗开关
const state = defineModel<boolean>('state', {
  default: () => false
})

// onMounted
onMounted(() => {
  switch (props.mode) {
    case DialogMode.VIEW:
      saveButtonState.value = false
      formDisabled.value = true
      break
    case DialogMode.EDIT:
      saveButtonState.value = true
      formDisabled.value = false
      break
    case DialogMode.NEW:
      saveButtonState.value = true
      formDisabled.value = false
      break
    default:
  }
})

// 事件
const emits = defineEmits(['saveButtonClicked', 'cancelButtonClicked'])

// 变量
// el-scrollbar组件实例
const scrollbarRef = ref()
// el-scrollbar的高度
const scrollContentHeight: Ref<UnwrapRef<number>> = ref(0)
// 表单总开关
const formDisabled = ref(true)
// 保存按钮开关
const saveButtonState = ref(false)

// 方法
// 处理保存按钮点击事件
function handleSaveButtonClicked() {
  emits('saveButtonClicked')
}
// 处理保存按钮点击事件
function handleCancelButtonClicked() {
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
    <template v-if="props.header" #header>
      <h4>{{ props.header }}</h4>
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
      <el-row>
        <el-col v-show="saveButtonState" :span="3">
          <el-button type="primary" @click="handleSaveButtonClicked">保存</el-button>
        </el-col>
        <el-col :span="3">
          <el-button @click="handleCancelButtonClicked">取消</el-button>
        </el-col>
      </el-row>
    </template>
  </el-dialog>
</template>

<style scoped></style>
