<script setup lang="ts">
import BaseFormDialog from '../common/BaseFormDialog.vue'
import DialogMode from '../../model/util/DialogMode'
import { h, nextTick, Ref, ref, UnwrapRef, VNode } from 'vue'
import TaskDTO from '../../model/main/dto/TaskDTO'
import SearchTable from '../common/SearchTable.vue'
import { Thead } from '../../model/util/Thead'
import { InputBox } from '../../model/util/InputBox'
import { TaskStatesEnum } from '../../constants/TaskStatesEnum'
import { ElTag } from 'element-plus'
import ApiUtil from '../../utils/ApiUtil'
import { isNullish, notNullish } from '../../utils/CommonUtil'
import { getNode } from '@renderer/utils/TreeUtil.ts'
import { throttle } from 'lodash'

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
  taskStartTask: window.api.taskStartTaskTree,
  taskRetryTask: window.api.taskRetryTaskTree,
  taskDeleteTask: window.api.taskDeleteTask,
  taskListSchedule: window.api.taskListSchedule,
  taskQueryChildrenTaskPage: window.api.taskQueryChildrenTaskPage,
  taskPauseTaskTree: window.api.taskPauseTaskTree,
  taskResumeTaskTree: window.api.taskResumeTaskTree
}
// childTaskSearchTable组件
const childTaskSearchTable = ref()
// baseDialog组件的实例
const baseDialog = ref()
// parentTaskInfo的dom元素
const parentTaskInfo = ref()
// 下级任务
const children: Ref<UnwrapRef<TaskDTO[]>> = ref([])
// 列表高度
const heightForSearchTable: Ref<UnwrapRef<number>> = ref(0)
// 弹窗开关
const state = ref(false)
// 表头
const thead: Ref<UnwrapRef<Thead[]>> = ref([
  new Thead({
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
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'url',
    label: 'url',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
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
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'createTime',
    label: '创建时间',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
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
  })
])
// 数据主键
const keyOfData: string = 'id'
// 主搜索栏的inputBox
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  new InputBox({
    name: 'taskName',
    type: 'text',
    placeholder: '输入任务的名称查询',
    inputSpan: 13
  }),
  new InputBox({
    name: 'siteDomain',
    type: 'text',
    placeholder: '输入站点的名称查询',
    inputSpan: 4
  }),
  new InputBox({
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
        value: TaskStatesEnum.PROCESSING,
        label: '进行中'
      },
      {
        value: TaskStatesEnum.WAITING,
        label: '等待中'
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
  })
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
// 是否正在刷新数据
let refreshing: boolean = false
// 防抖动refreshTask
const throttleRefreshTask = throttle(() => refreshTask(), 500, { leading: true, trailing: true })

// 方法
function handleDialog(newState: boolean) {
  state.value = newState
  nextTick(() => {
    const baseDialogHeader =
      baseDialog.value.$el.parentElement.querySelector('.el-dialog__header')?.clientHeight
    const baseDialogFooter =
      baseDialog.value.$el.parentElement.querySelector('.el-dialog__footer')?.clientHeight
    heightForSearchTable.value =
      parentTaskInfo.value.clientHeight + baseDialogFooter + baseDialogHeader

    childTaskSearchTable.value.handleSearchButtonClicked()
  })
}
// 刷新任务进度和状态
async function refreshTask() {
  if (!refreshing) {
    refreshing = true
    // 获取需要刷新的任务
    const getRefreshTasks = (): number[] => {
      // 获取可视区域及附近的行id
      const visibleRowsId = childTaskSearchTable.value
        .getVisibleRows(200, 200)
        .map((id: string) => Number(id))
      // 利用树形工具找到所有id对应的数据，判断是否需要刷新
      const tempRoot = new TaskDTO()
      tempRoot.children = children.value
      return visibleRowsId.filter((id: number) => {
        const task = getNode<TaskDTO>(tempRoot, id)
        return (
          notNullish(task) &&
          (task.status === TaskStatesEnum.WAITING ||
            task.status === TaskStatesEnum.PROCESSING ||
            task.status === TaskStatesEnum.PAUSE)
        )
      })
    }

    let refreshTasks: number[] = getRefreshTasks()

    while (refreshTasks.length > 0) {
      await childTaskSearchTable.value.refreshData(refreshTasks, false)
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (isNullish(childTaskSearchTable.value)) {
        break
      }
      refreshTasks = getRefreshTasks()
    }
    refreshing = false
  }
}
// 滚动事件处理函数
function handleScroll() {
  throttleRefreshTask()
}
// 处理操作栏按钮点击事件
function handleOperationButtonClicked(row: TaskDTO, code: OperationCode) {
  switch (code) {
    case OperationCode.START:
      startTask(row, false)
      throttleRefreshTask()
      break
    case OperationCode.PAUSE:
      apis.taskPauseTaskTree([row.id])
      throttleRefreshTask()
      break
    case OperationCode.RESUME:
      apis.taskResumeTaskTree([row.id])
      throttleRefreshTask()
      break
    case OperationCode.RETRY:
      startTask(row, true)
      throttleRefreshTask()
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
// 开始任务
function startTask(row: TaskDTO, retry: boolean) {
  if (retry) {
    apis.taskRetryTask([row.id])
  } else {
    apis.taskStartTask([row.id])
  }
  row.status = TaskStatesEnum.WAITING
  if (row.isCollection && notNullish(row.children)) {
    row.children.forEach((child) => (child.status = TaskStatesEnum.WAITING))
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
        v-model:data-list="children"
        :style="{ height: 'calc(90vh - ' + heightForSearchTable + 'px)', minHeight: '350px' }"
        style="flex-grow: 1"
        :selectable="true"
        :thead="thead"
        :search-api="apis.taskQueryChildrenTaskPage"
        :update-api="apis.taskListSchedule"
        :update-param-name="['schedule', 'status']"
        :fixed-param="{ pid: formData.id }"
        :drop-down-input-boxes="[]"
        :key-of-data="keyOfData"
        :main-input-boxes="mainInputBoxes"
        :multi-select="true"
        :changed-rows="changedRows"
        :custom-operation-button="true"
        @scroll="handleScroll"
      >
        <template #customOperations="{ row }">
          <div style="display: flex; flex-direction: column; align-items: center">
            <el-button-group>
              <el-tooltip v-if="(row as TaskDTO).isCollection" content="详情">
                <el-button
                  size="small"
                  icon="View"
                  @click="handleOperationButtonClicked(row, OperationCode.VIEW)"
                />
              </el-tooltip>
              <el-tooltip :content="mapToButtonStatus(row).tooltip">
                <el-button
                  size="small"
                  :icon="mapToButtonStatus(row).icon"
                  :loading="!(row as TaskDTO).continuable && mapToButtonStatus(row).processing"
                  @click="handleOperationButtonClicked(row, mapToButtonStatus(row).operation)"
                ></el-button>
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
              v-if="row.status === TaskStatesEnum.PROCESSING || row.status === TaskStatesEnum.PAUSE"
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
