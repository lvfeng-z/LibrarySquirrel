<script setup lang="ts">
import DialogMode from '../../model/util/DialogMode'
import ApiUtil from '../../utils/ApiUtil'
import lodash from 'lodash'
import FormDialog from '@renderer/components/dialogs/FormDialog.vue'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'
import AutoLoadSelect from '@renderer/components/common/AutoLoadSelect.vue'
import SiteTagLocalRelateDTO from '@renderer/model/main/dto/SiteTagLocalRelateDTO.ts'
import { localTagQuerySelectItemPage } from '@renderer/apis/LocalTagApi.ts'

// props
const props = withDefaults(
  defineProps<{
    mode?: DialogMode
    submitEnabled?: boolean
  }>(),
  {
    mode: DialogMode.EDIT,
    submitEnabled: true
  }
)

// model
// 表单数据
const formData = defineModel<SiteTagLocalRelateDTO>('formData', { required: true })
// 弹窗开关
const state = defineModel<boolean>('state', { required: true })

// 事件
const emits = defineEmits(['requestSuccess'])

// 变量
// 接口
const apis = {
  localTagQuerySelectItemPage: window.api.localTagQuerySelectItemPage,
  siteTagSave: window.api.siteTagSave,
  siteTagUpdateById: window.api.siteTagUpdateById
}

// 方法
// 处理保存按钮点击事件
async function handleSaveButtonClicked() {
  if (props.submitEnabled) {
    if (props.mode === DialogMode.NEW) {
      const tempFormData = lodash.cloneDeep(formData.value)
      const response = await apis.siteTagSave(tempFormData)
      if (ApiUtil.check(response)) {
        emits('requestSuccess')
        state.value = false
      }
      ApiUtil.msg(response)
    }
    if (props.mode === DialogMode.EDIT) {
      const tempFormData = lodash.cloneDeep(formData.value)
      const response = await apis.siteTagUpdateById(tempFormData)
      if (ApiUtil.check(response)) {
        emits('requestSuccess')
        state.value = false
      }
      ApiUtil.msg(response)
    }
  }
}
</script>

<template>
  <form-dialog v-model:form-data="formData" v-model:state="state" :mode="props.mode" @save-button-clicked="handleSaveButtonClicked">
    <template #form>
      <el-row>
        <el-col>
          <el-form-item label="名称">
            <el-input v-model="formData.siteTagName"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col>
          <el-form-item label="描述">
            <el-input v-model="formData.description" type="textarea"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col>
          <el-form-item label="本地标签">
            <auto-load-select v-model="formData.localTagId" :load="localTagQuerySelectItemPage" remote filterable clearable>
              <template #default="{ list }">
                <el-option
                  v-if="NotNullish(formData.localTag)"
                  :hidden="true"
                  :value="formData.localTag.id"
                  :label="formData.localTag.localTagName"
                ></el-option>
                <el-option v-for="item in list" :key="item.value" :value="item.value" :label="item.label" />
              </template>
            </auto-load-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="创建时间">
            <el-date-picker v-model="formData.createTime" type="datetime" value-format="x" disabled></el-date-picker>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="修改时间">
            <el-date-picker v-model="formData.updateTime" type="datetime" value-format="x" disabled></el-date-picker>
          </el-form-item>
        </el-col>
      </el-row>
    </template>
  </form-dialog>
</template>

<style scoped></style>
