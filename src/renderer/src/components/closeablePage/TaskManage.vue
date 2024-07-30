<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { onMounted, Ref, ref, UnwrapRef } from 'vue'
import ApiResponse from '../../model/util/ApiResponse'
import ApiUtil from '../../utils/ApiUtil'
import SearchTable from '../common/SearchTable.vue'
import Thead from '../../model/util/Thead'
import InputBox from '../../model/util/InputBox'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import TaskDTO from '../../model/main/dto/TaskDTO'
import apiUtil from '../../utils/ApiUtil'
import { TreeNode } from 'element-plus'
import { isNullish } from '../../utils/CommonUtil'

// onMounted
onMounted(() => {
  taskManageSearchTable.value.handleSearchButtonClicked()
})

// 变量
const apis = {
  siteGetSelectItemPage: window.api.siteGetSelectItemPage,
  taskCreateTask: window.api.taskCreateTask,
  taskStartTask: window.api.taskStartTask,
  taskSelectTreeDataPage: window.api.taskSelectTreeDataPage,
  taskSelectParentPage: window.api.taskSelectParentPage,
  taskGetChildrenTask: window.api.taskGetChildrenTask,
  dirSelect: window.api.dirSelect
} // 接口
// 搜索组件ref
const taskManageSearchTable = ref()
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
    name: 'siteDomain',
    label: '站点',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  },
  {
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'status',
    label: '状态',
    hide: false,
    width: 80,
    headerAlign: 'center',
    dataAlign: 'center',
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
    type: 'datetime',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'createTime',
    label: '创建时间',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }
])
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
    useApi: true,
    api: apis.siteGetSelectItemPage,
    pagingApi: true
  },
  {
    name: 'status',
    type: 'select',
    inputSpan: 4,
    selectData: [
      {
        value: '0',
        label: '未开始'
      },
      {
        value: '1',
        label: '进行中'
      },
      {
        value: '2',
        label: '暂停'
      },
      {
        value: '3',
        label: '已完成'
      },
      {
        value: '4',
        label: '失败'
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
  if (apiUtil.apiResponseCheck(response)) {
    const data = apiUtil.apiResponseGetData(response) as TaskDTO[]
    resolve(data)
  }
}
// 给行添加class
function tableRowClassName(data: { row: unknown; rowIndex: number }) {
  const row = data.row as TaskDTO
  if (row.hasChildren || isNullish(row.parentId)) {
    return 'task-manage-search-table-parent-row'
  } else {
    return 'task-manage-search-table-child-row'
  }
}
// 开始任务
// function startTask() {
//   apis.taskStartTask(taskId.value)
// }
// 选择目录
async function selectDir(openFile: boolean) {
  const response = (await apis.dirSelect(openFile)) as ApiResponse
  if (ApiUtil.apiResponseCheck(response)) {
    const dirSelectResult = ApiUtil.apiResponseGetData(response) as Electron.OpenDialogReturnValue
    if (!dirSelectResult.canceled) {
      for (const dir of dirSelectResult.filePaths) {
        await importFromDir(dir)
      }
    }
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
        <el-button size="large" type="primary" icon="Link">从站点下载</el-button>
      </el-col>
    </el-row>
    <div class="task-manage-search-table-wrapper rounded-margin-box">
      <search-table
        ref="taskManageSearchTable"
        v-model:changed-rows="changedRows"
        class="task-manage-search-table"
        :selectable="true"
        :thead="thead"
        :search-api="apis.taskSelectParentPage"
        :main-input-boxes="mainInputBoxes"
        :drop-down-input-boxes="[]"
        key-of-data="id"
        :table-row-class-name="tableRowClassName"
        :lazy="true"
        :load="load"
        :multi-select="true"
        :default-page-size="50"
        :operation-button="operationButton"
        :custom-operation-button="true"
        :tree-data="true"
      >
        <template #customOperations="row">
          <el-button icon="VideoPlay" @click="console.log(JSON.stringify(row.row))"></el-button>
        </template>
      </search-table>
    </div>
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
