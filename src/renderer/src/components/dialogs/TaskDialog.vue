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
import ApiUtil from '../../utils/ApiUtil'
import { notNullish } from '../../utils/CommonUtil'

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
  taskDeleteTask: window.api.taskDeleteTask,
  taskSelectChildrenTaskPage: window.api.taskSelectChildrenTaskPage
}
// childTaskSearchTable组件
const childTaskSearchTable = ref()
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
    render: getTaskStatusElTag
  }
])
// 数据主键
const keyOfData: string = 'id'
// 主搜索栏的inputBox
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  {
    name: 'taskName',
    type: 'text',
    placeholder: '输入任务的名称查询',
    inputSpan: 13
  },
  {
    name: 'siteDomain',
    type: 'text',
    placeholder: '输入站点的名称查询',
    inputSpan: 4
  },
  {
    name: 'status',
    type: 'select',
    placeholder: '选择状态',
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
  VIEW,
  START,
  PAUSE,
  RESUME,
  RETRY,
  CANCEL,
  DELETE
}
// 任务状态与操作按钮状态的对应关系
const taskStatusMapping: {
  [K in TaskStatesEnum]: {
    tooltip: string
    icon: string
    operation: OperationCode
    processing: boolean
  }
} = {
  [TaskStatesEnum.CREATED]: {
    tooltip: '开始',
    icon: 'VideoPlay',
    operation: OperationCode.START,
    processing: false
  },
  [TaskStatesEnum.PROCESSING]: {
    tooltip: '暂停',
    icon: 'VideoPause',
    operation: OperationCode.PAUSE,
    processing: true
  },
  [TaskStatesEnum.WAITING]: {
    tooltip: '等待中',
    icon: 'Loading',
    operation: OperationCode.START,
    processing: true
  },
  [TaskStatesEnum.PAUSE]: {
    tooltip: '继续',
    icon: 'RefreshRight',
    operation: OperationCode.RESUME,
    processing: false
  },
  [TaskStatesEnum.FINISHED]: {
    tooltip: '再次下载',
    icon: 'RefreshRight',
    operation: OperationCode.RETRY,
    processing: false
  },
  [TaskStatesEnum.PARTLY_FINISHED]: {
    tooltip: '开始',
    icon: 'VideoPlay',
    operation: OperationCode.START,
    processing: false
  },
  [TaskStatesEnum.FAILED]: {
    tooltip: '重试',
    icon: 'RefreshRight',
    operation: OperationCode.RETRY,
    processing: false
  }
}

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

    childTaskSearchTable.value.handleSearchButtonClicked()
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
      console.log('重试')
      break
    case OperationCode.CANCEL:
      break
    case OperationCode.DELETE:
      deleteTask([row.id as number])
      break
    default:
      break
  }
}
// 获取表示任务状态的ElTag的render函数
function getTaskStatusElTag(data: TaskStatesEnum): VNode {
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
// 任务状态映射为按钮状态
function mapToButtonStatus(row: TaskDTO): {
  tooltip: string
  icon: string
  operation: OperationCode
  processing: boolean
} {
  if (notNullish(row.status)) {
    return taskStatusMapping[row.status]
  } else {
    return taskStatusMapping['0']
  }
}
// 删除任务
async function deleteTask(ids: number[]) {
  const response = await apis.taskDeleteTask(ids)
  ApiUtil.apiResponseMsg(response)
  if (ApiUtil.apiResponseCheck(response)) {
    await childTaskSearchTable.value.handleSearchButtonClicked()
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
            <el-col :span="7">
              <el-form-item label="站点">
                <el-input v-model="formData.siteDomain"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="3">
              <el-form-item label="状态">
                <component :is="getTaskStatusElTag(formData.status as TaskStatesEnum)" />
              </el-form-item>
            </el-col>
            <el-col :span="7">
              <el-form-item label="创建时间">
                <el-date-picker v-model="formData.createTime" type="datetime"></el-date-picker>
              </el-form-item>
            </el-col>
            <el-col :span="7">
              <el-form-item label="修改时间">
                <el-date-picker v-model="formData.updateTime" type="datetime"></el-date-picker>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>
    </template>
    <template #afterForm>
      <search-table
        ref="childTaskSearchTable"
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
        :custom-operation-button="true"
      >
        <template #customOperations="{ row }">
          <div style="display: flex; flex-direction: column; align-items: center">
            <el-button-group>
              <el-tooltip :content="mapToButtonStatus(row).tooltip">
                <el-button
                  size="small"
                  :icon="mapToButtonStatus(row).icon"
                  :loading="mapToButtonStatus(row).processing"
                  @click="handleOperationButtonClicked(row, mapToButtonStatus(row).operation)"
                ></el-button>
              </el-tooltip>
              <el-tooltip content="暂停">
                <el-button
                  size="small"
                  icon="VideoPause"
                  @click="handleOperationButtonClicked(row, OperationCode.PAUSE)"
                />
              </el-tooltip>
              <el-tooltip content="取消">
                <el-button
                  size="small"
                  icon="CircleClose"
                  @click="handleOperationButtonClicked(row, OperationCode.CANCEL)"
                />
              </el-tooltip>
              <el-tooltip content="删除">
                <el-button
                  size="small"
                  icon="Delete"
                  @click="handleOperationButtonClicked(row, OperationCode.DELETE)"
                />
              </el-tooltip>
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
    </template>
  </base-form-dialog>
</template>

<style scoped></style>
