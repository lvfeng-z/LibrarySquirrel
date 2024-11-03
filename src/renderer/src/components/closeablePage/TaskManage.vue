<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { h, onMounted, Ref, ref, UnwrapRef, VNode } from 'vue'
import ApiUtil from '../../utils/ApiUtil'
import SearchTable from '../common/SearchTable.vue'
import { Thead } from '../../model/util/Thead'
import { InputBox } from '../../model/util/InputBox'
import DialogMode from '../../model/util/DialogMode'
import TaskDTO from '../../model/main/dto/TaskDTO'
import { ElMessage, ElTag } from 'element-plus'
import { isNullish, notNullish } from '../../utils/CommonUtil'
import { throttle } from 'lodash'
import { TaskStatesEnum } from '../../constants/TaskStatesEnum'
import { getNode } from '../../utils/TreeUtil'
import TaskDialog from '../dialogs/TaskDialog.vue'
import PageModel from '../../model/util/PageModel'
import BaseQueryDTO from '../../model/main/queryDTO/BaseQueryDTO'
import TaskCreateResponse from '../../model/util/TaskCreateResponse'
import ApiResponse from '@renderer/model/util/ApiResponse.ts'

// onMounted
onMounted(() => {
  taskManageSearchTable.value.handleSearchButtonClicked()
})

// 变量
// 接口
const apis = {
  taskCreateTask: window.api.taskCreateTask,
  taskStartTask: window.api.taskStartTaskTree,
  taskRetryTask: window.api.taskRetryTaskTree,
  taskDeleteTask: window.api.taskDeleteTask,
  taskQueryTreeDataPage: window.api.taskQueryTreeDataPage,
  taskQueryParentPage: window.api.taskQueryParentPage,
  taskQueryChildrenTaskPage: window.api.taskQueryChildrenTaskPage,
  taskListSchedule: window.api.taskListSchedule,
  taskPauseTaskTree: window.api.taskPauseTaskTree,
  taskResumeTaskTree: window.api.taskResumeTaskTree,
  dirSelect: window.api.dirSelect
}
// DataTable的数据
const dataList: Ref<UnwrapRef<TaskDTO[]>> = ref([])
// taskManageSearchTable的组件实例
const taskManageSearchTable = ref()
// taskDialog的组件实例
const taskDialogRef = ref()
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
  })
])
// 数据主键
const keyOfData: string = 'id'
// 主搜索栏的inputBox
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  new InputBox({
    name: 'taskName',
    type: 'text',
    placeholder: '输入任务的名称',
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
// 当前dialog绑定数据
const dialogData: Ref<UnwrapRef<TaskDTO>> = ref(new TaskDTO())
// 站点下载dialog的开关
const siteDownloadState: Ref<UnwrapRef<boolean>> = ref(false)
// 站点资源的url
const siteSourceUrl: Ref<UnwrapRef<string>> = ref('')

// 方法
// 从本地路径导入
async function importFromDir(dir: string) {
  const response = await apis.taskCreateTask('file://'.concat(dir))
  if (ApiUtil.apiResponseCheck(response)) {
    const data = ApiUtil.apiResponseGetData(response) as TaskCreateResponse
    if (data.succeed) {
      ElMessage({
        type: 'success',
        message: `${data.plugin?.author}.${data.plugin?.domain}.${data.plugin?.version}创建了 ${data.addedQuantity} 个任务`
      })
    } else {
      ElMessage({
        type: 'error',
        message: data.msg as string
      })
    }
  }
}
// 从站点url导入
async function importFromSite() {
  const response = await apis.taskCreateTask(siteSourceUrl.value)
  if (ApiUtil.apiResponseCheck(response)) {
    siteDownloadState.value = false
    const data = ApiUtil.apiResponseGetData(response) as TaskCreateResponse
    if (data.succeed) {
      ElMessage({
        type: 'success',
        message: `${data.plugin?.author}.${data.plugin?.domain}.${data.plugin?.version}创建了 ${data.addedQuantity} 个任务`
      })
    } else {
      ElMessage({
        type: 'error',
        message: data.msg as string
      })
    }
  }
  // 刷新一次列表
  taskManageSearchTable.value.handleSearchButtonClicked()
}
// 懒加载处理函数
async function load(row: unknown): Promise<TaskDTO[]> {
  // 配置分页参数
  const pageCondition: PageModel<BaseQueryDTO, object> = new PageModel()
  pageCondition.pageSize = 100
  pageCondition.pageNumber = 1
  // 配置查询参数
  pageCondition.query = { ...new BaseQueryDTO(), ...{ pid: (row as TaskDTO).id } }

  return apis.taskQueryChildrenTaskPage(pageCondition).then((response: ApiResponse) => {
    if (ApiUtil.apiResponseCheck(response)) {
      const page = ApiUtil.apiResponseGetData(response) as PageModel<BaseQueryDTO, object>
      const data = (page.data === undefined ? [] : page.data) as TaskDTO[]
      // 子任务列表赋值给对应的父任务的children
      const parent = dataList.value.find((task) => (row as TaskDTO).id === task.id)
      if (notNullish(parent)) {
        parent.children = data
      }
      return data
    } else {
      ApiUtil.apiResponseMsg(response)
      return []
    }
  })
}
// 给行添加选择器，用于区分父任务和子任务
function tableRowClassName(data: { row: unknown; rowIndex: number }) {
  const row = data.row as TaskDTO
  if (row.hasChildren || isNullish(row.pid) || row.pid === 0) {
    return 'task-manage-search-table-parent-row'
  } else {
    return 'task-manage-search-table-child-row'
  }
}
// 处理操作栏按钮点击事件
function handleOperationButtonClicked(row: TaskDTO, code: OperationCode) {
  switch (code) {
    case OperationCode.VIEW:
      dialogData.value = row
      taskDialogRef.value.handleDialog(true)
      break
    case OperationCode.START:
      startTask(row, false)
      refreshTask()
      break
    case OperationCode.PAUSE:
      apis.taskPauseTaskTree([row.id])
      refreshTask()
      break
    case OperationCode.RESUME:
      apis.taskResumeTaskTree([row.id])
      refreshTask()
      break
    case OperationCode.RETRY:
      startTask(row, true)
      refreshTask()
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
// 选择目录
async function selectDir(openFile: boolean) {
  const response = await apis.dirSelect(openFile)
  if (ApiUtil.apiResponseCheck(response)) {
    const dirSelectResult = ApiUtil.apiResponseGetData(response) as Electron.OpenDialogReturnValue
    if (!dirSelectResult.canceled) {
      for (const dir of dirSelectResult.filePaths) {
        await importFromDir(dir)
      }
      // 刷新一次列表
      taskManageSearchTable.value.handleSearchButtonClicked()
    }
  }
}
// 打开站点下载dialog
function handleSiteDownloadDialog(_event, newState?: boolean) {
  if (notNullish(newState)) {
    siteDownloadState.value = newState
  } else {
    siteDownloadState.value = !siteDownloadState.value
  }
}
// 刷新任务进度和状态
async function refreshTask() {
  if (!refreshing) {
    refreshing = true
    // 获取需要刷新的任务
    const getRefreshTasks = (): number[] => {
      // 获取可视区域及附近的行id
      const visibleRowsId = taskManageSearchTable.value
        .getVisibleRows(200, 200)
        .map((id: string) => Number(id))
      // 利用树形工具找到所有id对应的数据，判断是否需要刷新
      const tempRoot = new TaskDTO()
      tempRoot.children = dataList.value
      console.log(tempRoot)
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
      await taskManageSearchTable.value.refreshData(refreshTasks, false)
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (isNullish(taskManageSearchTable.value)) {
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
    await taskManageSearchTable.value.handleSearchButtonClicked()
  }
}
</script>

<template>
  <base-closeable-page>
    <el-row class="task-manage-local-import-button-row">
      <el-col class="task-manage-local-import-button-col" :span="12">
        <el-dropdown>
          <el-button size="large" type="danger" icon="Monitor" @click="selectDir(false)">
            从本地导入
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="selectDir(true)">选择文件导入</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-col>
      <el-col class="task-manage-site-import-button-col" :span="12">
        <el-button
          v-model="siteDownloadState"
          size="large"
          type="primary"
          icon="Link"
          @click="handleSiteDownloadDialog"
          >从站点下载
        </el-button>
      </el-col>
    </el-row>
    <div class="task-manage-search-table-wrapper rounded-margin-box">
      <search-table
        ref="taskManageSearchTable"
        v-model:data-list="dataList"
        v-model:changed-rows="changedRows"
        class="task-manage-search-table"
        :selectable="true"
        :thead="thead"
        :search-api="apis.taskQueryParentPage"
        :update-api="apis.taskListSchedule"
        :update-param-name="['schedule', 'status']"
        :main-input-boxes="mainInputBoxes"
        :drop-down-input-boxes="[]"
        :key-of-data="keyOfData"
        :table-row-class-name="tableRowClassName"
        :lazy="true"
        :load="load"
        :multi-select="true"
        :default-page-size="50"
        :custom-operation-button="true"
        :tree-data="true"
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
                  :loading="
                    mapToButtonStatus(row).processing &&
                    !(row as TaskDTO).continuable &&
                    !(row as TaskDTO).isCollection
                  "
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
              v-show="
                row.status === TaskStatesEnum.PROCESSING || row.status === TaskStatesEnum.PAUSE
              "
              style="width: 100%"
              :percentage="isNullish(row.schedule) ? 0 : Math.round(row.schedule * 100) / 100"
              text-inside
              :stroke-width="15"
              striped
              striped-flow
              :duration="5"
            >
              <template #default="{ percentage }">
                <span style="font-size: 15px">{{ percentage }}%</span>
              </template>
            </el-progress>
          </div>
        </template>
      </search-table>
    </div>
    <template #dialog>
      <task-dialog
        ref="taskDialogRef"
        :mode="DialogMode.VIEW"
        :form-data="dialogData"
        align-center
        destroy-on-close
        width="90%"
      />
      <el-dialog v-model="siteDownloadState" center width="80%" align-center destroy-on-close>
        <el-input
          v-model="siteSourceUrl"
          type="textarea"
          :rows="6"
          placeholder="输入url"
        ></el-input>
        <template #footer>
          <el-button type="primary" @click="importFromSite">确定</el-button>
          <el-button @click="siteDownloadState = false">取消</el-button>
        </template>
      </el-dialog>
    </template>
  </base-closeable-page>
</template>

<style scoped>
.task-manage-local-import-button-row {
  height: 50px;
}
.task-manage-local-import-button-col {
  display: flex;
  justify-content: center;
  align-items: center;
}
.task-manage-site-import-button-col {
  display: flex;
  justify-content: center;
  align-items: center;
}
.task-manage-search-table-wrapper {
  height: calc(100% - 50px);
}
.task-manage-search-table {
  height: 100%;
  width: 100%;
}
:deep(.el-table .task-manage-search-table-parent-row) {
  font-weight: bold;
}
:deep(.el-table .task-manage-search-table-child-row > :nth-child(3) > .cell :nth-child(1)) {
  transform: translateX(7px);
}
</style>
