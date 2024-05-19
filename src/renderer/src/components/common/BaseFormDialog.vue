<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
</script>

<template>
  <el-dialog v-model="state" class="dialog-form" center>
    <template v-if="props.header" #header>
      <h4>{{ props.header }}</h4>
    </template>
    <el-scrollbar class="dialog-form-scroll">
      <div class="dialog-form-scroll-form">
        <el-form v-model="formData" :disabled="formDisabled">
          <slot name="default" />
        </el-form>
        <el-row>
          <el-col v-show="saveButtonState" :span="3">
            <el-button type="primary" @click="handleSaveButtonClicked">保存</el-button>
          </el-col>
          <el-col :span="3">
            <el-button @click="handleCancelButtonClicked">取消</el-button>
          </el-col>
        </el-row>
      </div>
    </el-scrollbar>
  </el-dialog>
</template>

<style scoped>
.dialog-form-scroll-form {
  max-height: 90vh;
}
</style>
