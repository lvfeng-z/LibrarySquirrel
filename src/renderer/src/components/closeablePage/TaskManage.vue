<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { h, onMounted, Ref, ref, UnwrapRef, VNode } from 'vue'
import ApiUtil from '../../utils/ApiUtil'
import SearchTable from '../common/SearchTable.vue'
import Thead from '../../model/util/Thead'
import InputBox from '../../model/util/InputBox'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import TaskDTO from '../../model/main/dto/TaskDTO'
import { ElTag, TreeNode } from 'element-plus'
import { isNullish, notNullish } from '../../utils/CommonUtil'
import { throttle } from 'lodash'
import { TaskStatesEnum } from '../../constants/TaskStatesEnum'
import { getNode } from '../../utils/TreeUtil'
import TaskDialog from '../dialogs/TaskDialog.vue'

// onMounted
onMounted(() => {
  taskManageSearchTable.value.handleSearchButtonClicked()
})

// 变量
// 接口
const apis = {
  taskCreateTask: window.api.taskCreateTask,
  taskStartTask: window.api.taskStartTask,
  taskSelectTreeDataPage: window.api.taskSelectTreeDataPage,
  taskSelectParentPage: window.api.taskSelectParentPage,
  taskGetChildrenTask: window.api.taskGetChildrenTask,
  taskSelectScheduleList: window.api.taskSelectScheduleList,
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
// 操作栏代码
const enum OperationCode {
  VIEW,
  START,
  PAUSE,
  RETRY,
  CANCEL,
  DELETE
}
// 是否正在刷新数据
let refreshing: boolean = false
// 当前dialog绑定数据
const dialogData: Ref<UnwrapRef<TaskDTO>> = ref(new TaskDTO())

// 方法
// 保存设置
async function importFromDir(dir: string) {
  await apis.taskCreateTask('file://'.concat(dir))
}
// 懒加载处理函数
async function load(
  row: unknown,
  _treeNode: TreeNode,
  resolve: (data: unknown[]) => void
): Promise<void> {
  const response = await apis.taskGetChildrenTask((row as TaskDTO).id)
  if (ApiUtil.apiResponseCheck(response)) {
    const data = ApiUtil.apiResponseGetData(response) as TaskDTO[]
    ;(row as TaskDTO).children = data
    resolve(data)
  }
}
// 给行添加class
function tableRowClassName(data: { row: unknown; rowIndex: number }) {
  const row = data.row as TaskDTO
  if (row.hasChildren || isNullish(row.pid)) {
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
      apis.taskStartTask([row.id])
      row.status = TaskStatesEnum.WAITING
      if (row.isCollection && notNullish(row.children)) {
        row.children.forEach((child) => (child.status = TaskStatesEnum.WAITING))
      }
      refreshTask()
      break
    case OperationCode.PAUSE:
      refreshTask()
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
// 选择目录
async function selectDir(openFile: boolean) {
  const response = await apis.dirSelect(openFile)
  if (ApiUtil.apiResponseCheck(response)) {
    const dirSelectResult = ApiUtil.apiResponseGetData(response) as Electron.OpenDialogReturnValue
    if (!dirSelectResult.canceled) {
      for (const dir of dirSelectResult.filePaths) {
        await importFromDir(dir)
      }
    }
  }
}
// 刷新任务进度和状态
async function refreshTask() {
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
    return visibleRowsId.filter((id: number) => {
      const task = getNode<TaskDTO>(tempRoot, id)
      return (
        notNullish(task) &&
        (task.status === TaskStatesEnum.WAITING || task.status === TaskStatesEnum.PROCESSING)
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
// 防抖动refreshTask
const throttleRefreshTask = throttle(
  () => {
    if (!refreshing) {
      refreshTask()
    }
  },
  500,
  { leading: true, trailing: true }
)
// 滚动事件处理函数
function handleScroll() {
  throttleRefreshTask()
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
        <el-button size="large" type="primary" icon="Link">从站点下载</el-button>
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
        :search-api="apis.taskSelectParentPage"
        :update-api="apis.taskSelectScheduleList"
        :update-param-name="['schedule', 'status']"
        :main-input-boxes="mainInputBoxes"
        :drop-down-input-boxes="[]"
        :key-of-data="keyOfData"
        :table-row-class-name="tableRowClassName"
        :lazy="true"
        :load="load"
        :multi-select="true"
        :default-page-size="50"
        :operation-button="operationButton"
        :custom-operation-button="true"
        :tree-data="true"
        @scroll="handleScroll"
      >
        <template #customOperations="{ row }">
          <div style="display: flex; flex-direction: column; align-items: center">
            <el-button-group>
              <el-button
                size="small"
                icon="View"
                @click="handleOperationButtonClicked(row, OperationCode.VIEW)"
              ></el-button>
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
    <template #dialog>
      <task-dialog
        ref="taskDialogRef"
        :mode="DialogMode.EDIT"
        :form-data="dialogData"
        align-center
        destroy-on-close
        width="90%"
      />
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
