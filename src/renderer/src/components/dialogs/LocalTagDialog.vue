<script setup lang="ts">
import { reactive, Ref, ref, UnwrapRef } from 'vue'
import LocalTag from '../../model/main/LocalTag'
import DialogMode from '../../model/util/DialogMode'
import ApiUtil from '../../utils/ApiUtil'
import TreeSelectNode from '../../model/util/TreeSelectNode'
import lodash from 'lodash'
import { getNode } from '../../utils/TreeUtil'
import FormDialog from '@renderer/components/dialogs/FormDialog.vue'

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
const formData: Ref<UnwrapRef<LocalTag>> = ref({
  id: undefined,
  baseLocalTagId: undefined,
  localTagName: undefined,
  createTime: undefined,
  updateTime: undefined
})
// 基础标签选择框数据
const baseTagSelectData: Ref<UnwrapRef<TreeSelectNode[]>> = ref([])
// 接口
const apis = reactive({
  localTagSave: window.api.localTagSave,
  localTagUpdateById: window.api.localTagUpdateById,
  localTagGetTree: window.api.localTagGetTree,
  localTagGetById: window.api.localTagGetById
})

// 方法
// 处理保存按钮点击事件
async function handleSaveButtonClicked() {
  if (props.submitEnabled) {
    if (props.mode === DialogMode.NEW) {
      const tempFormData = lodash.cloneDeep(formData.value)
      const response = await apis.localTagSave(tempFormData)
      if (ApiUtil.check(response)) {
        emits('requestSuccess')
        await handleDialog(false)
      }
      ApiUtil.msg(response)
    }
    if (props.mode === DialogMode.EDIT) {
      const tempFormData = lodash.cloneDeep(formData.value)
      const response = await apis.localTagUpdateById(tempFormData)
      if (ApiUtil.check(response)) {
        emits('requestSuccess')
        await handleDialog(false)
      }
      ApiUtil.msg(response)
    }
  }
}
// 开启、关闭弹窗
async function handleDialog(newState: boolean, newFormData?: LocalTag) {
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
    // 请求本地标签树接口
    const baseTagTreeResponse = await apis.localTagGetTree(0)
    if (ApiUtil.check(baseTagTreeResponse)) {
      // 创建临时的根节点，便于遍历整个树
      let tempNode = new TreeSelectNode()
      tempNode.children = ApiUtil.data(baseTagTreeResponse) as TreeSelectNode[]
      // 根据接口响应值，重新构建树，否则子节点不包含getNode方法
      tempNode = new TreeSelectNode(tempNode)
      // 绑定到临时根节点的子结点列表上
      baseTagSelectData.value = tempNode.children as TreeSelectNode[]

      // 查询当前标签对应的节点，并禁用
      const self = getNode(tempNode, formData.value.id as number)
      if (self !== undefined) {
        self.disabled = true
      }
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
    baseLocalTagId: undefined,
    localTagName: undefined,
    createTime: undefined,
    updateTime: undefined
  }
}
</script>

<template>
  <form-dialog
    v-model:form-data="formData"
    v-model:state="state"
    :mode="props.mode"
    @close="handleDialog(false)"
    @save-button-clicked="handleSaveButtonClicked"
    @cancel-button-clicked="handleDialog(false)"
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
            <el-tree-select
              v-model="formData.baseLocalTagId"
              :check-strictly="true"
              :data="baseTagSelectData"
              clearable
            ></el-tree-select>
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
  </form-dialog>
</template>

<style scoped></style>
