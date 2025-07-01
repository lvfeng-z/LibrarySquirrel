<script setup lang="ts">
import Electron from 'electron'
import BaseSubpage from './BaseSubpage.vue'
import { h, onMounted, Ref, ref, UnwrapRef, VNode } from 'vue'
import ApiUtil from '../../utils/ApiUtil'
import SearchTable from '../common/SearchTable.vue'
import { Thead } from '../../model/util/Thead'
import DialogMode from '../../model/util/DialogMode'
import TaskTreeDTO from '../../model/main/dto/TaskTreeDTO.ts'
import { ElTag } from 'element-plus'
import { ArrayNotEmpty, IsNullish, NotNullish } from '../../utils/CommonUtil'
import { throttle } from 'lodash'
import { TaskStatusEnum } from '../../constants/TaskStatusEnum.ts'
import { GetNode } from '../../utils/TreeUtil'
import TaskDialog from '../dialogs/TaskDialog.vue'
import Page from '../../model/util/Page.ts'
import TaskCreateResponse from '../../model/util/TaskCreateResponse'
import ApiResponse from '@renderer/model/util/ApiResponse.ts'
import { TaskOperationCodeEnum } from '@renderer/constants/TaskOperationCodeEnum.ts'
import TaskOperationBarActive from '@renderer/components/common/TaskOperationBarActive.vue'
import TaskScheduleDTO from '@renderer/model/main/dto/TaskScheduleDTO.ts'
import TaskQueryDTO from '@renderer/model/main/queryDTO/TaskQueryDTO.ts'
import Task from '@renderer/model/main/entity/Task.ts'
import { useTaskStore } from '@renderer/store/UseTaskStore.ts'
import { useParentTaskStore } from '@renderer/store/UseParentTaskStore.ts'
import NotificationItem from '@renderer/model/util/NotificationItem.ts'
import { useNotificationStore } from '@renderer/store/UseNotificationStore.ts'
import { siteQuerySelectItemPage } from '@renderer/apis/SiteApi.ts'
import AutoLoadSelect from '@renderer/components/common/AutoLoadSelect.vue'

// onMounted
onMounted(() => {
  taskManageSearchTable.value.doSearch()
})

// 变量
// 接口
const apis = {
  siteQuerySelectItemPage: window.api.siteQuerySelectItemPage,
  taskCreateTask: window.api.taskCreateTask,
  taskListStatus: window.api.taskListStatus,
  taskStartTask: window.api.taskStartTaskTree,
  taskRetryTask: window.api.taskRetryTaskTree,
  taskDeleteTask: window.api.taskDeleteTask,
  taskQueryParentPage: window.api.taskQueryParentPage,
  taskQueryChildrenTaskPage: window.api.taskQueryChildrenTaskPage,
  taskPauseTaskTree: window.api.taskPauseTaskTree,
  taskStopTaskTree: window.api.taskStopTaskTree,
  taskResumeTaskTree: window.api.taskResumeTaskTree,
  dirSelect: window.api.dirSelect
}
// taskManageSearchTable的组件实例
const taskManageSearchTable = ref()
// 任务SearchTable的数据
const dataList: Ref<UnwrapRef<TaskTreeDTO[]>> = ref([])
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
    showOverflowTooltip: true
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
    showOverflowTooltip: true
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'siteName',
    title: '站点',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    showOverflowTooltip: true
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
    showOverflowTooltip: true
  }),
  new Thead({
    type: 'custom',
    defaultDisabled: true,
    dblclickToEdit: false,
    key: 'status',
    title: '状态',
    hide: false,
    width: 80,
    headerAlign: 'center',
    dataAlign: 'center',
    showOverflowTooltip: false,
    editMethod: 'replace',
    render: (data: TaskStatusEnum): VNode => {
      let tagType: 'success' | 'warning' | 'info' | 'primary' | 'danger' | undefined
      let tagText: string | undefined
      switch (data) {
        case TaskStatusEnum.CREATED:
          tagType = 'primary'
          tagText = '已创建'
          break
        case TaskStatusEnum.PROCESSING:
          tagType = 'warning'
          tagText = '进行中'
          break
        case TaskStatusEnum.WAITING:
          tagType = 'warning'
          tagText = '等待中'
          break
        case TaskStatusEnum.PAUSE:
          tagType = 'info'
          tagText = '已暂停'
          break
        case TaskStatusEnum.FINISHED:
          tagType = 'success'
          tagText = '完成'
          break
        case TaskStatusEnum.PARTLY_FINISHED:
          tagType = 'success'
          tagText = '部分完成'
          break
        case TaskStatusEnum.FAILED:
          tagType = 'danger'
          tagText = '失败'
          break
      }
      const elTag = h(ElTag, { type: tagType }, () => tagText)
      return h('div', { style: { display: 'flex', 'align-items': 'center', 'justify-content': 'center' } }, elTag)
    }
  })
])
// 任务SearchTable的分页
const page: Ref<UnwrapRef<Page<TaskQueryDTO, Task>>> = ref(new Page<TaskQueryDTO, Task>())
// 任务查询的参数
const taskSearchParams: Ref<TaskQueryDTO> = ref(new TaskQueryDTO())
// 改变的行数据
const changedRows: Ref<UnwrapRef<object[]>> = ref([])
// 是否正在刷新数据
let refreshing: boolean = false
// 防抖动refreshTask
const throttleRefreshTask = throttle(() => refreshTask(), 500, { leading: true, trailing: true })
// 当前dialog绑定数据
const dialogData: Ref<UnwrapRef<TaskTreeDTO>> = ref(new TaskTreeDTO())
// 任务详情的dialog开关
const taskDialogState: Ref<UnwrapRef<boolean>> = ref(false)
// 任务详情的dialog的searchTable开关
const taskDialogSearchTableState: Ref<boolean> = ref(false)
// 站点下载dialog的开关
const siteDownloadState: Ref<UnwrapRef<boolean>> = ref(false)
// 站点资源的url
const siteSourceUrl: Ref<UnwrapRef<string>> = ref('')
const taskStore = useTaskStore()
const parentTaskStore = useParentTaskStore()

// 方法
// 从本地路径导入
async function importFromDir(dir: string) {
  const notificationItem = new NotificationItem()
  notificationItem.title = `正在从【${dir}】创建任务`
  const notificationStore = useNotificationStore()
  const notificationId = notificationStore.add(notificationItem)
  apis.taskCreateTask('file://'.concat(dir)).then((response: ApiResponse) => handleCreatTaskResponse(response, notificationId))
}
// 从站点url导入
async function importFromSite() {
  const notificationItem = new NotificationItem()
  notificationItem.title = `正在从【${siteSourceUrl.value}】创建任务`
  const notificationStore = useNotificationStore()
  const notificationId = notificationStore.add(notificationItem)
  apis.taskCreateTask(siteSourceUrl.value).then((response: ApiResponse) => handleCreatTaskResponse(response, notificationId))
  siteDownloadState.value = false
}
// 处理任务创建的响应
function handleCreatTaskResponse(response: ApiResponse, notificationId: string) {
  let type: 'error' | 'primary' | 'success' | 'warning' | 'info'
  let msg: string
  if (ApiUtil.check(response)) {
    const data = ApiUtil.data<TaskCreateResponse>(response)
    if (NotNullish(data)) {
      // 刷新一次列表
      taskManageSearchTable.value.doSearch()
      if (data.succeed) {
        type = 'success'
        msg = `${data.plugin?.author}-${data.plugin?.name}-${data.plugin?.version}创建了 ${data.addedQuantity} 个任务`
      } else {
        type = 'error'
        msg = '创建失败' + data.msg
      }
    } else {
      type = 'error'
      msg = '创建失败'
    }
  } else {
    type = 'error'
    msg = '创建失败'
  }
  useNotificationStore().remove(notificationId, {
    type: type,
    msg: msg
  })
}
// 分页查询子任务的函数
async function taskQueryParentPage(page: Page<TaskQueryDTO, object>): Promise<Page<TaskQueryDTO, object> | undefined> {
  if (IsNullish(page.query)) {
    page.query = new TaskQueryDTO()
  }
  if (ArrayNotEmpty(page.query.sort)) {
    page.query.sort = [
      ...page.query.sort,
      ...[
        { key: 'createTime', asc: false },
        { key: 'updateTime', asc: false }
      ]
    ]
  } else {
    page.query.sort = [
      { key: 'createTime', asc: false },
      { key: 'updateTime', asc: false }
    ]
  }
  const response = await apis.taskQueryParentPage(page)
  if (ApiUtil.check(response)) {
    return ApiUtil.data(response) as Page<TaskQueryDTO, object>
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 懒加载处理函数
async function load(row: unknown): Promise<TaskTreeDTO[]> {
  // 配置分页参数
  const pageCondition: Page<TaskQueryDTO, object> = new Page()
  pageCondition.pageSize = 100
  pageCondition.pageNumber = 1
  // 配置查询参数
  pageCondition.query = { ...new TaskQueryDTO(), ...{ pid: (row as TaskTreeDTO).id } }

  return apis.taskQueryChildrenTaskPage(pageCondition).then((response: ApiResponse) => {
    if (ApiUtil.check(response)) {
      const page = ApiUtil.data(response) as Page<TaskQueryDTO, object>
      const data = (page.data === undefined ? [] : page.data) as TaskTreeDTO[]
      // 子任务列表赋值给对应的父任务的children
      const parent = dataList.value.find((task) => (row as TaskTreeDTO).id === task.id)
      if (NotNullish(parent)) {
        parent.children = data
      }
      return data
    } else {
      ApiUtil.msg(response)
      return []
    }
  })
}
// 更新进度的数据加载函数
async function updateLoad(ids: (number | string)[]): Promise<TaskScheduleDTO[] | undefined> {
  const scheduleList: TaskScheduleDTO[] = []
  const notFoundList: (number | string)[] = []
  for (const id of ids) {
    let tempStatus = parentTaskStore.getTask(Number(id))
    if (NotNullish(tempStatus)) {
      scheduleList.push(tempStatus)
      continue
    }
    tempStatus = taskStore.getTask(Number(id))
    if (NotNullish(tempStatus)) {
      scheduleList.push(tempStatus)
      continue
    }
    notFoundList.push(id)
  }
  if (ArrayNotEmpty(notFoundList)) {
    const response = await apis.taskListStatus(notFoundList)
    if (ApiUtil.check(response)) {
      const responseScheduleList = ApiUtil.data<TaskScheduleDTO[]>(response)
      if (ArrayNotEmpty(responseScheduleList)) {
        scheduleList.push(...responseScheduleList)
      }
    }
  }
  return ArrayNotEmpty(scheduleList) ? scheduleList : undefined
}
// 给行添加选择器，用于区分父任务和子任务
function tableRowClassName(data: { row: unknown; rowIndex: number }) {
  const row = data.row as TaskTreeDTO
  if (row.hasChildren || IsNullish(row.pid) || row.pid === 0) {
    return 'task-manage-search-table-parent-row'
  } else {
    return 'task-manage-search-table-child-row'
  }
}
// 处理操作栏按钮点击事件
function handleOperationButtonClicked(row: TaskTreeDTO, code: TaskOperationCodeEnum) {
  switch (code) {
    case TaskOperationCodeEnum.VIEW:
      dialogData.value = row
      taskDialogSearchTableState.value = NotNullish(row.isCollection) && Boolean(row.isCollection)
      taskDialogState.value = true
      break
    case TaskOperationCodeEnum.START:
      startTask(row, false)
      refreshTask()
      break
    case TaskOperationCodeEnum.PAUSE:
      apis.taskPauseTaskTree([row.id])
      refreshTask()
      break
    case TaskOperationCodeEnum.RESUME:
      apis.taskResumeTaskTree([row.id])
      refreshTask()
      break
    case TaskOperationCodeEnum.RETRY:
      startTask(row, true)
      refreshTask()
      break
    case TaskOperationCodeEnum.CANCEL:
      apis.taskStopTaskTree([row.id])
      break
    case TaskOperationCodeEnum.DELETE:
      deleteTask([row.id as number])
      break
    default:
      break
  }
}
// 选择目录
async function selectDir(openFile: boolean) {
  const response = await apis.dirSelect(openFile, true)
  if (ApiUtil.check(response)) {
    const dirSelectResult = ApiUtil.data(response) as Electron.OpenDialogReturnValue
    if (!dirSelectResult.canceled) {
      for (const dir of dirSelectResult.filePaths) {
        await importFromDir(dir)
      }
    }
  }
}
// 打开站点下载dialog
function handleSiteDownloadDialog(_event, newState?: boolean) {
  if (NotNullish(newState)) {
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
      const visibleRowsId = taskManageSearchTable.value.getVisibleRows(200, 200).map((id: string) => Number(id))
      // 利用树形工具找到所有id对应的数据，判断是否需要刷新
      const tempRoot = new TaskTreeDTO()
      tempRoot.children = dataList.value
      return visibleRowsId.filter((id: number) => {
        const task = GetNode<TaskTreeDTO>(tempRoot, id)
        return (
          NotNullish(task) &&
          (task.status === TaskStatusEnum.WAITING ||
            task.status === TaskStatusEnum.PROCESSING ||
            task.status === TaskStatusEnum.PAUSE ||
            parentTaskStore.hasTask(task.id as number) ||
            taskStore.hasTask(task.id as number))
        )
      })
    }

    let refreshTasks: number[] = getRefreshTasks()

    while (refreshTasks.length > 0) {
      await taskManageSearchTable.value.refreshData(refreshTasks, false)
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (IsNullish(taskManageSearchTable.value)) {
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
// 开始任务
function startTask(row: TaskTreeDTO, retry: boolean) {
  if (retry) {
    apis.taskRetryTask([row.id]).then((response: ApiResponse) => {
      if (!ApiUtil.check(response)) {
        ApiUtil.failedMsg(response)
      }
    })
  } else {
    apis.taskStartTask([row.id]).then((response: ApiResponse) => {
      if (!ApiUtil.check(response)) {
        ApiUtil.failedMsg(response)
      }
    })
  }
  row.status = TaskStatusEnum.WAITING
  if (row.isCollection && NotNullish(row.children)) {
    row.children.forEach((child) => (child.status = TaskStatusEnum.WAITING))
  }
}
// 删除任务
async function deleteTask(ids: number[]) {
  const response = await apis.taskDeleteTask(ids)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    await taskManageSearchTable.value.doSearch()
  }
}
</script>

<template>
  <base-subpage>
    <el-row class="task-manage-local-import-button-row">
      <el-col class="task-manage-local-import-button-col" :span="12">
        <el-dropdown>
          <el-button size="large" type="danger" icon="Monitor" @click="selectDir(false)"> 从本地导入 </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="selectDir(true)">选择文件导入</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-col>
      <el-col class="task-manage-site-import-button-col" :span="12">
        <el-button v-model="siteDownloadState" size="large" type="primary" icon="Link" @click="handleSiteDownloadDialog">
          从站点下载
        </el-button>
      </el-col>
    </el-row>
    <div class="task-manage-search-table-wrapper">
      <search-table
        ref="taskManageSearchTable"
        v-model:data="dataList"
        v-model:page="page"
        v-model:toolbar-params="taskSearchParams"
        v-model:changed-rows="changedRows"
        class="task-manage-search-table"
        :selectable="true"
        :thead="thead"
        :search="taskQueryParentPage"
        :update-load="updateLoad"
        :update-properties="['status']"
        data-key="id"
        :table-row-class-name="tableRowClassName"
        :tree-lazy="true"
        :tree-load="load"
        :multi-select="true"
        :default-page-size="10"
        :custom-operation-button="true"
        :tree-data="true"
        @scroll="handleScroll"
      >
        <template #toolbarMain>
          <el-row class="task-manage-search-bar">
            <el-col :span="14">
              <el-input v-model="taskSearchParams.taskName" placeholder="输入任务名称" clearable />
            </el-col>
            <el-col :span="6">
              <auto-load-select
                v-model="taskSearchParams.siteId"
                :load="siteQuerySelectItemPage"
                placeholder="选择站点"
                remote
                filterable
                clearable
              >
                <template #default="{ list }">
                  <el-option v-for="item in list" :key="item.value" :value="item.value" :label="item.label" />
                </template>
              </auto-load-select>
            </el-col>
            <el-col :span="4">
              <el-select v-model="taskSearchParams.status" placeholder="选择状态" clearable>
                <el-option :value="TaskStatusEnum.CREATED" label="已创建"></el-option>
                <el-option :value="TaskStatusEnum.WAITING" label="等待中"></el-option>
                <el-option :value="TaskStatusEnum.PROCESSING" label="进行中"></el-option>
                <el-option :value="TaskStatusEnum.PAUSE" label="暂停"></el-option>
                <el-option :value="TaskStatusEnum.FINISHED" label="完成"></el-option>
                <el-option :value="TaskStatusEnum.PARTLY_FINISHED" label="部分完成"></el-option>
                <el-option :value="TaskStatusEnum.FAILED" label="失败"></el-option>
              </el-select>
            </el-col>
          </el-row>
        </template>
        <template #customOperations="{ row }">
          <task-operation-bar-active :row="row" :button-clicked="handleOperationButtonClicked" />
        </template>
      </search-table>
    </div>
    <template #dialog>
      <task-dialog
        v-model:state="taskDialogState"
        v-model:form-data="dialogData"
        :mode="DialogMode.VIEW"
        :show-search-table="taskDialogSearchTableState"
        align-center
        destroy-on-close
        width="90%"
      />
      <el-dialog v-model="siteDownloadState" center width="80%" align-center destroy-on-close>
        <el-input v-model="siteSourceUrl" type="textarea" :rows="6" placeholder="输入url"></el-input>
        <template #footer>
          <el-button type="primary" @click="importFromSite">确定</el-button>
          <el-button @click="siteDownloadState = false">取消</el-button>
        </template>
      </el-dialog>
    </template>
  </base-subpage>
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
  background: #f4f4f4;
  border-radius: 6px;
  width: calc(100% - 20px);
  height: calc(100% - 20px - 50px);
  padding: 5px;
  margin: 5px;
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
.task-manage-search-bar {
  flex-grow: 1;
}
</style>
