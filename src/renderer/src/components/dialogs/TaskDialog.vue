<script setup lang="ts">
import BaseFormDialog from '../common/BaseFormDialog.vue'
import DialogMode from '../../model/util/DialogMode'
import { Ref, ref, UnwrapRef } from 'vue'
import TaskDTO from '../../model/main/dto/TaskDTO'

// props
const props = defineProps<{
  mode: DialogMode
}>()

// model
const formData: Ref<UnwrapRef<TaskDTO>> = defineModel('formData', { type: TaskDTO, required: true })

// 暴露
defineExpose({
  handleDialog
})

// 变量
// 弹窗开关
const state = ref(false)

// 方法
function handleDialog(newState: boolean) {
  state.value = newState
}
</script>

<template>
  <base-form-dialog v-model:form-data="formData" v-model:state="state" :mode="props.mode">
    <template #default>
      <el-row>
        <el-col>
          <el-input v-model="formData.taskName"></el-input>
        </el-col>
      </el-row>
    </template>
  </base-form-dialog>
</template>

<style scoped></style>
