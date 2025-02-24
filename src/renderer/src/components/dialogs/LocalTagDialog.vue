<script setup lang="ts">
import LocalTag from '../../model/main/entity/LocalTag.ts'
import DialogMode from '../../model/util/DialogMode'
import ApiUtil from '../../utils/ApiUtil'
import TreeSelectNode from '../../model/util/TreeSelectNode'
import lodash from 'lodash'
import FormDialog from '@renderer/components/dialogs/FormDialog.vue'
import { ElTreeSelect } from 'element-plus'

// props
const props = withDefaults(
  defineProps<{
    mode: DialogMode
    submitEnabled?: boolean
  }>(),
  {
    mode: DialogMode.EDIT,
    submitEnabled: true
  }
)

// model
// 表单数据
const formData = defineModel<LocalTag>('formData', { required: true })
// 弹窗开关
const state = defineModel<boolean>('state', { required: true })

// 事件
const emits = defineEmits(['requestSuccess'])

// 变量
// 接口
const apis = {
  localTagSave: window.api.localTagSave,
  localTagUpdateById: window.api.localTagUpdateById,
  localTagGetTree: window.api.localTagGetTree,
  localTagGetById: window.api.localTagGetById
}
// 树形选择组件配置
const treeProps = {
  label: 'label',
  children: 'children',
  isLeaf: 'isLeaf'
}

// 方法
// 处理保存按钮点击事件
async function handleSaveButtonClicked() {
  if (props.submitEnabled) {
    if (props.mode === DialogMode.NEW) {
      const tempFormData = lodash.cloneDeep(formData.value)
      const response = await apis.localTagSave(tempFormData)
      if (ApiUtil.check(response)) {
        emits('requestSuccess')
        state.value = false
      }
      ApiUtil.msg(response)
    }
    if (props.mode === DialogMode.EDIT) {
      const tempFormData = lodash.cloneDeep(formData.value)
      const response = await apis.localTagUpdateById(tempFormData)
      if (ApiUtil.check(response)) {
        emits('requestSuccess')
        state.value = false
      }
      ApiUtil.msg(response)
    }
  }
}
async function load(node, resolve) {
  if (node.isLeaf) {
    return resolve([])
  }
  const baseTagTreeResponse = await apis.localTagGetTree(node.data.id)
  if (ApiUtil.check(baseTagTreeResponse)) {
    const children = ApiUtil.data<TreeSelectNode[]>(baseTagTreeResponse)
    children?.forEach((child) => {
      child.isLeaf = Boolean(child.isLeaf)
      if (formData.value.id === child.id) {
        child.disabled = true
      }
    })
    resolve(children)
  } else {
    return resolve([])
  }
}
</script>

<template>
  <form-dialog
    v-model:form-data="formData"
    v-model:state="state"
    :mode="props.mode"
    @save-button-clicked="handleSaveButtonClicked"
    @cancel-button-clicked="state = false"
  >
    <template #form>
      <el-row>
        <el-col>
          <el-form-item label="名称">
            <el-input v-model="formData.localTagName"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col>
          <el-form-item label="基础标签">
            <el-tree-select v-model="formData.baseLocalTagId" :lazy="true" :load="load" :props="treeProps" clearable />
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
