<script setup lang="ts">
import BaseFormDialog from '../common/BaseFormDialog.vue'
import DialogMode from '../../model/util/DialogMode'
import { h, nextTick, Ref, ref, UnwrapRef, VNode } from 'vue'
import TaskDTO from '../../model/main/dto/TaskDTO'
import SearchTable from '../common/SearchTable.vue'
import Thead from '../../model/util/Thead'
import { TaskStatesEnum } from '../../constants/TaskStatesEnum'
import { ElTag } from 'element-plus'
import InputBox from '../../model/util/InputBox'
import OperationItem from '../../model/util/OperationItem'

// props
const props = defineProps<{
  mode: DialogMode
}>()

// model
const formData: Ref<UnwrapRef<TaskDTO>> = defineModel('formData', { type: Object, required: true })

// 暴露
defineExpose({
  handleDialog
})

// 变量
// 接口
const apis = {
  taskStartTask: window.api.taskStartTask,
  taskSelectChildrenTaskPage: window.api.taskSelectChildrenTaskPage
}
// baseDialog组件的实例
const baseDialog = ref()
// parentTaskInfo的dom元素
const parentTaskInfo = ref()
// 列表高度
const heightForSearchTable: Ref<UnwrapRef<number>> = ref(0)
// 弹窗开关
const state = ref(false)
// 表头
const thead: Ref<UnwrapRef<Thead[]>> = ref([
  {
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'taskName',
    label: '名称',
    hide: false,
    width: 200,
    headerAlign: 'center',
    dataAlign: 'left',
    overHide: true
  },
  {
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'url',
    label: 'url',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  },
  {
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'siteDomain',
    label: '站点',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  },
  {
    type: 'datetime',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'createTime',
    label: '创建时间',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  },
  {
    type: 'custom',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'status',
    label: '状态',
    hide: false,
    width: 80,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true,
    render: (data: TaskStatesEnum): VNode => {
      let tagType: 'success' | 'warning' | 'info' | 'primary' | 'danger' | undefined
      let tagText: string | undefined
      switch (data) {
        case TaskStatesEnum.CREATED:
          tagType = 'primary'
          tagText = '已创建'
          break
        case TaskStatesEnum.PROCESSING:
          tagType = 'warning'
          tagText = '进行中'
          break
        case TaskStatesEnum.WAITING:
          tagType = 'warning'
          tagText = '等待中'
          break
        case TaskStatesEnum.PAUSE:
          tagType = 'info'
          tagText = '已暂停'
          break
        case TaskStatesEnum.FINISHED:
          tagType = 'success'
          tagText = '完成'
          break
        case TaskStatesEnum.PARTLY_FINISHED:
          tagType = 'success'
          tagText = '部分完成'
          break
        case TaskStatesEnum.FAILED:
          tagType = 'danger'
          tagText = '失败'
          break
      }
      const elTag = h(ElTag, { type: tagType }, () => tagText)
      return h(
        'div',
        { style: { display: 'flex', 'align-items': 'center', 'justify-content': 'center' } },
        elTag
      )
    }
  }
])
// 数据主键
const keyOfData: string = 'id'
// 主搜索栏的inputBox
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  {
    name: 'taskName',
    type: 'text',
    placeholder: '输入任务的名称',
    inputSpan: 13
  },
  {
    name: 'site_domain',
    type: 'select',
    inputSpan: 4,
    pagingApi: true
  },
  {
    name: 'status',
    type: 'select',
    inputSpan: 4,
    selectData: [
      {
        value: TaskStatesEnum.CREATED,
        label: '已创建'
      },
      {
        value: TaskStatesEnum.PAUSE,
        label: '暂停'
      },
      {
        value: TaskStatesEnum.FINISHED,
        label: '已完成'
      },
      {
        value: TaskStatesEnum.FAILED,
        label: '失败'
      },
      {
        value: TaskStatesEnum.PARTLY_FINISHED,
        label: '部分完成'
      }
    ]
  }
])
// 改变的行数据
const changedRows: Ref<UnwrapRef<object[]>> = ref([])
// 操作栏代码
const enum OperationCode {
  START,
  PAUSE,
  RETRY,
  CANCEL,
  DELETE
}
// SearchTable的operationButton
const operationButton: OperationItem[] = [
  {
    label: '保存',
    icon: 'Checked',
    buttonType: 'primary',
    code: 'save',
    rule: (row) => changedRows.value.includes(row)
  },
  { label: '查看', icon: 'view', code: DialogMode.VIEW },
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
  { label: '删除', icon: 'delete', code: 'delete' }
]

// 方法
function handleDialog(newState: boolean) {
  state.value = newState
  nextTick(() => {
    const baseDialogHeader =
      baseDialog.value.$el.parentElement.querySelector('.el-dialog__header').clientHeight
    const baseDialogFooter =
      baseDialog.value.$el.parentElement.querySelector('.el-dialog__footer').clientHeight
    heightForSearchTable.value =
      parentTaskInfo.value.clientHeight + baseDialogFooter + baseDialogHeader
  })
}
// 处理操作栏按钮点击事件
function handleOperationButtonClicked(row: TaskDTO, code: OperationCode) {
  switch (code) {
    case OperationCode.START:
      apis.taskStartTask([row.id])
      row.status = TaskStatesEnum.WAITING
      break
    case OperationCode.PAUSE:
      break
    case OperationCode.RETRY:
      break
    case OperationCode.CANCEL:
      break
    case OperationCode.DELETE:
      break
    default:
      break
  }
}
</script>

<template>
  <base-form-dialog
    ref="baseDialog"
    v-model:form-data="formData"
    v-model:state="state"
    :mode="props.mode"
  >
    <template #form>
      <div style="height: 100%; display: flex; flex-direction: column">
        <div ref="parentTaskInfo">
          <el-row>
            <el-col>
              <el-form-item label="名称">
                <el-input v-model="formData.taskName"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col>
              <el-form-item label="url">
                <el-input v-model="formData.url"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="12">
              <el-form-item label="站点">
                <el-input v-model="formData.siteDomain"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-input v-model="formData.status"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="12">
              <el-form-item label="创建时间">
                <el-date-picker v-model="formData.createTime" type="datetime"></el-date-picker>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="修改时间">
                <el-date-picker v-model="formData.updateTime" type="datetime"></el-date-picker>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <search-table
          :style="{ height: 'calc(90vh - ' + heightForSearchTable + 'px)', minHeight: '350px' }"
          style="flex-grow: 1"
          :selectable="true"
          :thead="thead"
          :search-api="apis.taskSelectChildrenTaskPage"
          :fixed-param="{ pid: formData.id }"
          :drop-down-input-boxes="[]"
          :key-of-data="keyOfData"
          :main-input-boxes="mainInputBoxes"
          :multi-select="true"
          :changed-rows="changedRows"
          :operation-button="operationButton"
          :custom-operation-button="true"
        >
          <template #customOperations="{ row }">
            <div style="display: flex; flex-direction: column; align-items: center">
              <el-button-group>
                <el-button
                  size="small"
                  icon="VideoPlay"
                  @click="handleOperationButtonClicked(row, OperationCode.START)"
                ></el-button>
                <el-button
                  size="small"
                  icon="VideoPause"
                  @click="handleOperationButtonClicked(row, OperationCode.PAUSE)"
                ></el-button>
                <el-button
                  size="small"
                  icon="RefreshRight"
                  @click="handleOperationButtonClicked(row, OperationCode.RETRY)"
                ></el-button>
                <el-button
                  size="small"
                  icon="CircleClose"
                  @click="handleOperationButtonClicked(row, OperationCode.CANCEL)"
                ></el-button>
                <el-button
                  size="small"
                  icon="Delete"
                  @click="handleOperationButtonClicked(row, OperationCode.DELETE)"
                ></el-button>
              </el-button-group>
              <el-progress
                v-if="
                  row.status === TaskStatesEnum.PROCESSING || row.status === TaskStatesEnum.WAITING
                "
                style="width: 100%"
                :percentage="row.schedule?.toFixed(2)"
                text-inside
                :stroke-width="17"
              ></el-progress>
            </div>
          </template>
        </search-table>
      </div>
    </template>
  </base-form-dialog>
</template>

<style scoped></style>
