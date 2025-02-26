<script setup lang="ts">
import DialogMode from '../../model/util/DialogMode'
import { h, nextTick, Ref, ref, UnwrapRef, VNode } from 'vue'
import TaskDTO from '../../model/main/dto/TaskDTO'
import SearchTable from '../common/SearchTable.vue'
import { Thead } from '../../model/util/Thead'
import { InputBox } from '../../model/util/InputBox'
import { TaskStatesEnum } from '../../constants/TaskStatesEnum'
import { ElTag } from 'element-plus'
import ApiUtil from '../../utils/ApiUtil'
import { ArrayNotEmpty, IsNullish, NotNullish } from '../../utils/CommonUtil'
import { GetNode } from '@renderer/utils/TreeUtil.ts'
import { throttle } from 'lodash'
import TaskOperationBar from '@renderer/components/common/TaskOperationBar.vue'
import { TaskOperationCodeEnum } from '@renderer/constants/TaskOperationCodeEnum.ts'
import FormDialog from '@renderer/components/dialogs/FormDialog.vue'
import Page from '@renderer/model/util/Page.ts'
import TaskQueryDTO from '@renderer/model/main/queryDTO/TaskQueryDTO.ts'
import Task from '@renderer/model/main/entity/Task.ts'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'

// props
const props = defineProps<{
  mode: DialogMode
}>()

// model
// 表单数据
const formData: Ref<UnwrapRef<TaskDTO>> = defineModel('formData', { type: Object, required: true })
// 弹窗开关
const state = defineModel<boolean>('state', { required: true })

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
// 表头
const thead: Ref<UnwrapRef<Thead[]>> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'taskName',
    title: '名称',
    hide: false,
    width: 200,
    headerAlign: 'center',
    dataAlign: 'left',
    overHide: true
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'url',
    title: 'url',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'siteDomain',
    title: '站点',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'createTime',
    title: '创建时间',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'custom',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'status',
    title: '状态',
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
    selectList: [
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
// 任务SearchTable的分页
const page: Ref<UnwrapRef<Page<TaskQueryDTO, Task>>> = ref(new Page<TaskQueryDTO, Task>())
// 改变的行数据
const changedRows: Ref<UnwrapRef<object[]>> = ref([])
// 是否正在刷新数据
let refreshing: boolean = false
// 防抖动refreshTask
const throttleRefreshTask = throttle(() => refreshTask(), 500, { leading: true, trailing: true })

// 方法
// 分页查询子任务的函数
async function taskQueryChildrenTaskPage(page: Page<TaskQueryDTO, object>): Promise<Page<TaskQueryDTO, object> | undefined> {
  if (IsNullish(page.query)) {
    page.query = new TaskQueryDTO()
  }
  page.query.pid = formData.value.id
  const response = await apis.taskQueryChildrenTaskPage(page)
  if (ApiUtil.check(response)) {
    return ApiUtil.data(response) as Page<TaskQueryDTO, object>
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 更新进度的数据加载函数
async function updateLoad(ids: (number | string)[]): Promise<TaskScheduleDTO[] | undefined> {
  const response = await apis.taskListSchedule(ids)
  if (ApiUtil.check(response)) {
    const scheduleList = ApiUtil.data(response) as TaskScheduleDTO[]
    return ArrayNotEmpty(scheduleList) ? scheduleList : undefined
  } else {
    return undefined
  }
}
// 开关dialog
function handleOpen() {
  nextTick(() => {
    const baseDialogHeader = baseDialog.value.$el.parentElement.querySelector('.el-dialog__header')?.clientHeight
    const baseDialogFooter = baseDialog.value.$el.parentElement.querySelector('.el-dialog__footer')?.clientHeight
    heightForSearchTable.value = parentTaskInfo.value.clientHeight + baseDialogFooter + baseDialogHeader

    childTaskSearchTable.value.doSearch()
  })
}
// 刷新任务进度和状态
async function refreshTask() {
  if (!refreshing) {
    refreshing = true
    // 获取需要刷新的任务
    const getRefreshTasks = (): number[] => {
      // 获取可视区域及附近的行id
      const visibleRowsId = childTaskSearchTable.value.getVisibleRows(200, 200).map((id: string) => Number(id))
      // 利用树形工具找到所有id对应的数据，判断是否需要刷新
      const tempRoot = new TaskDTO()
      tempRoot.children = children.value
      return visibleRowsId.filter((id: number) => {
        const task = GetNode<TaskDTO>(tempRoot, id)
        return (
          NotNullish(task) &&
          (task.status === TaskStatesEnum.WAITING || task.status === TaskStatesEnum.PROCESSING || task.status === TaskStatesEnum.PAUSE)
        )
      })
    }

    let refreshTasks: number[] = getRefreshTasks()

    while (refreshTasks.length > 0) {
      await childTaskSearchTable.value.refreshData(refreshTasks, false)
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (IsNullish(childTaskSearchTable.value)) {
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
function handleOperationButtonClicked(row: TaskDTO, code: TaskOperationCodeEnum) {
  switch (code) {
    case TaskOperationCodeEnum.START:
      startTask(row, false)
      throttleRefreshTask()
      break
    case TaskOperationCodeEnum.PAUSE:
      apis.taskPauseTaskTree([row.id])
      throttleRefreshTask()
      break
    case TaskOperationCodeEnum.RESUME:
      apis.taskResumeTaskTree([row.id])
      throttleRefreshTask()
      break
    case TaskOperationCodeEnum.RETRY:
      startTask(row, true)
      throttleRefreshTask()
      break
    case TaskOperationCodeEnum.CANCEL:
      break
    case TaskOperationCodeEnum.DELETE:
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
  return h('div', { style: { display: 'flex', 'align-items': 'center', 'justify-content': 'center' } }, elTag)
}
// 开始任务
function startTask(row: TaskDTO, retry: boolean) {
  if (retry) {
    apis.taskRetryTask([row.id])
  } else {
    apis.taskStartTask([row.id])
  }
  row.status = TaskStatesEnum.WAITING
  if (row.isCollection && NotNullish(row.children)) {
    row.children.forEach((child) => (child.status = TaskStatesEnum.WAITING))
  }
}
// 删除任务
async function deleteTask(ids: number[]) {
  const response = await apis.taskDeleteTask(ids)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    await childTaskSearchTable.value.doSearch()
  }
}
</script>

<template>
  <form-dialog ref="baseDialog" v-model:form-data="formData" v-model:state="state" :mode="props.mode" @open="handleOpen">
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
                <el-input v-model="formData.id"></el-input>
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
        v-model:page="page"
        v-model:data-list="children"
        :style="{ height: 'calc(90vh - ' + heightForSearchTable + 'px)', minHeight: '350px' }"
        style="flex-grow: 1"
        :selectable="true"
        :thead="thead"
        :search="taskQueryChildrenTaskPage"
        :update-load="updateLoad"
        :update-properties="['schedule', 'status']"
        :drop-down-input-boxes="[]"
        :key-of-data="keyOfData"
        :main-input-boxes="mainInputBoxes"
        :multi-select="true"
        :changed-rows="changedRows"
        :custom-operation-button="true"
        @scroll="handleScroll"
      >
        <template #customOperations="{ row }">
          <task-operation-bar :row="row" :button-clicked="handleOperationButtonClicked" />
        </template>
      </search-table>
    </template>
  </form-dialog>
</template>

<style scoped></style>
