<script setup lang="ts">
import BaseFormDialog from '../common/BaseFormDialog.vue'
import { Ref, ref, UnwrapRef } from 'vue'
import DialogMode from '../../model/util/DialogMode'
import ApiUtil from '../../utils/ApiUtil'
import lodash from 'lodash'
import LocalAuthor from '../../model/main/LocalAuthor'

// props
const props = withDefaults(
  defineProps<{
    mode: DialogMode
    submitEnabled?: boolean
  }>(),
  {
    mode: undefined,
    submitEnabled: true
  }
)

// 事件
const emits = defineEmits(['requestSuccess'])

// 暴露
defineExpose({
  handleDialog
})

// 变量
// 弹窗开关
const state = ref(false)
// 表单数据
const formData: Ref<UnwrapRef<LocalAuthor>> = ref({
  id: undefined,
  localAuthorName: undefined,
  createTime: undefined,
  updateTime: undefined
})
// 接口
const apis = {
  localAuthorSave: window.api.localAuthorSave,
  localAuthorUpdateById: window.api.localAuthorUpdateById,
  localAuthorGetById: window.api.localAuthorGetById
}

// 方法
// 处理保存按钮点击事件
async function handleSaveButtonClicked() {
  if (props.submitEnabled) {
    if (props.mode === DialogMode.NEW) {
      const tempFormData = lodash.cloneDeep(formData.value)
      const response = await apis.localAuthorSave(tempFormData)
      if (ApiUtil.apiResponseCheck(response)) {
        emits('requestSuccess')
        await handleDialog(false)
      }
      ApiUtil.apiResponseMsg(response)
    }
    if (props.mode === DialogMode.EDIT) {
      const tempFormData = lodash.cloneDeep(formData.value)
      const response = await apis.localAuthorUpdateById(tempFormData)
      if (ApiUtil.apiResponseCheck(response)) {
        emits('requestSuccess')
        await handleDialog(false)
      }
      ApiUtil.apiResponseMsg(response)
    }
  }
}
// 开启、关闭弹窗
async function handleDialog(newState: boolean, newFormData?: LocalAuthor) {
  if (newState) {
    if (newFormData) {
      formData.value = newFormData
      // // 请求标签详情接口
      // const localTagInfoResponse = await apis.localTagGetById(newFormData.id)
      // if (apiResponseCheck(localTagInfoResponse)) {
      //   formData.value = apiResponseGetData(localTagInfoResponse) as LocalTag
      // }
    } else {
      clearFormData()
    }
  } else {
    clearFormData()
  }
  state.value = newState
}
// innerFormData置空
function clearFormData() {
  formData.value = {
    id: undefined,
    localAuthorName: undefined,
    createTime: undefined,
    updateTime: undefined
  }
}
</script>
<!--2024-05-07 el-date-picker组件会触发警告：[Violation] Added non-passive event listener to a scroll-blocking 'touchstart' event. Consider marking event handler as 'passive' to make the page more responsive.-->
<template>
  <BaseFormDialog
    v-model:form-data="formData"
    v-model:state="state"
    :mode="props.mode"
    @close="handleDialog(false)"
    @save-button-clicked="handleSaveButtonClicked"
    @cancel-button-clicked="handleDialog(false)"
  >
    <template #default>
      <el-row>
        <el-col>
          <el-form-item label="名称">
            <el-input v-model="formData.localAuthorName"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="创建时间">
            <el-date-picker
              v-model="formData.createTime"
              type="datetime"
              value-format="x"
              disabled
            ></el-date-picker>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="修改时间">
            <el-date-picker
              v-model="formData.updateTime"
              type="datetime"
              value-format="x"
              disabled
            ></el-date-picker>
          </el-form-item>
        </el-col>
      </el-row>
    </template>
  </BaseFormDialog>
</template>

<style scoped></style>
