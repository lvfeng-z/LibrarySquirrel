<script setup lang="ts">
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'
import SearchTable from '@renderer/components/common/SearchTable.vue'
import { onMounted, ref, Ref, UnwrapRef } from 'vue'
import Page from '@renderer/model/util/Page.ts'
import OperationItem from '@renderer/model/util/OperationItem.ts'
import DialogMode from '@renderer/model/util/DialogMode.ts'
import { Thead } from '@renderer/model/util/Thead.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import DataTableOperationResponse from '@renderer/model/util/DataTableOperationResponse.ts'
import { ArrayNotEmpty, IsNullish } from '@renderer/utils/CommonUtil.ts'
import Plugin from '@renderer/model/main/entity/Plugin.ts'
import PluginQueryDTO from '@renderer/model/main/queryDTO/PluginQueryDTO.ts'
import { ElMessage, ElMessageBox } from 'element-plus'
import PluginDialog from '@renderer/components/dialogs/PluginDialog.vue'
import Electron from 'electron'
import StringUtil from '@renderer/utils/StringUtil.ts'

// onMounted
onMounted(() => {
  if (IsNullish(pluginPage.value.query)) {
    pluginPage.value.query = new PluginQueryDTO()
  }
  pluginPage.value.query.sort = [
    { key: 'updateTime', asc: false },
    { key: 'createTime', asc: false }
  ]
  pluginSearchTable.value.doSearch()
})

// 变量
const apis = {
  dirSelect: window.api.dirSelect,
  pluginQueryPage: window.api.pluginQueryPage,
  pluginInstallFromPath: window.api.pluginInstallFromPath,
  pluginReInstall: window.api.pluginReInstall,
  pluginReInstallFromPath: window.api.pluginReInstallFromPath,
  pluginUnInstall: window.api.pluginUnInstall
}
// 插件数据表组件的实例
const pluginSearchTable = ref()
// 插件域名数据表组件的实例
const pluginDomainSearchTable = ref()
// 插件分页参数
const pluginPage: Ref<Page<PluginQueryDTO, Plugin>> = ref(new Page<PluginQueryDTO, Plugin>())
// 插件操作栏按钮
const pluginOperationButton: OperationItem<Plugin>[] = [
  { label: '查看', icon: 'View', code: DialogMode.VIEW },
  { label: '修复', icon: 'Refresh', code: 'reinstall' },
  { label: '卸载', icon: 'delete', code: 'uninstall' }
]
// 插件的表头
const pluginThead: Ref<UnwrapRef<Thead[]>> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    key: 'name',
    title: '名称',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    showOverflowTooltip: true
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    key: 'author',
    title: '作者',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    key: 'version',
    title: '版本号',
    hide: false,
    width: 100,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    key: 'createTime',
    title: '安装时间',
    hide: false,
    width: 180,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true
  })
])
// 插件的查询参数
const pluginSearchParams: Ref<PluginQueryDTO> = ref<PluginQueryDTO>(new PluginQueryDTO())
// 被选中的插件
const pluginSelected: Ref<UnwrapRef<Plugin>> = ref(new Plugin())
// 对话框开关
const dialogState: Ref<boolean> = ref(false)
// 对话框的数据
const dialogData: Ref<Plugin> = ref(new Plugin())

// 方法
// 分页查询插件
async function pluginQueryPage(page: Page<PluginQueryDTO, Plugin>): Promise<Page<PluginQueryDTO, Plugin> | undefined> {
  const response = await apis.pluginQueryPage(page)
  if (ApiUtil.check(response)) {
    return ApiUtil.data<Page<PluginQueryDTO, Plugin>>(response)
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 处理插件数据行按钮点击事件
function handleRowButtonClicked(op: DataTableOperationResponse<Plugin>) {
  switch (op.code) {
    case DialogMode.VIEW:
      dialogData.value = op.data
      dialogState.value = true
      break
    case 'reinstall':
      beforeReInstall(Number(op.id))
      break
    case 'uninstall':
      unInstall(Number(op.id))
      break
    default:
      break
  }
}
// 处理被选中的插件改变的事件
async function handleSelectionChange(selections: Plugin[]) {
  if (selections.length > 0) {
    pluginSelected.value = selections[0]
  }
  pluginDomainSearchTable.value.doSearch()
}
// 重新安装前询问安装来源
async function beforeReInstall(pluginId: number) {
  ElMessageBox.confirm('请选择修复方式', '', {
    confirmButtonText: '自动修复',
    cancelButtonText: '选择安装包修复',
    type: 'warning'
  })
    .then(() => reInstall(pluginId))
    .catch(async () => {
      const packagePath = await selectPackage()
      if (StringUtil.isNotBlank(packagePath)) {
        reInstallFromPath(pluginId, packagePath)
      }
    })
}
// 重新安装
async function reInstall(pluginId: number) {
  const response = await apis.pluginReInstall(pluginId)
  pluginSearchTable.value.doSearch()
  if (ApiUtil.check(response)) {
    ElMessage({
      type: 'success',
      message: '修复完成'
    })
  } else {
    ElMessage({
      type: 'error',
      message: `修复失败，${response.msg}`
    })
  }
}
// 卸载
async function unInstall(pluginId: number) {
  const response = await apis.pluginUnInstall(pluginId)
  pluginSearchTable.value.doSearch()
  if (ApiUtil.check(response)) {
    ElMessage({
      type: 'success',
      message: '已卸载'
    })
  } else {
    ElMessage({
      type: 'error',
      message: `卸载失败，${response.message}`
    })
  }
}
// 选择安装包
async function selectPackage(): Promise<string | undefined> {
  const response = await apis.dirSelect(true, true)
  if (ApiUtil.check(response)) {
    const dirSelectResult = ApiUtil.data(response) as Electron.OpenDialogReturnValue
    if (!dirSelectResult.canceled && ArrayNotEmpty(dirSelectResult.filePaths)) {
      return dirSelectResult.filePaths[0]
    }
  }
  return undefined
}
// 通过安装包路径安装插件
// async function installFromPath(packagePath: string) {
//   const result = await apis.pluginInstallFromPath(packagePath)
//   pluginSearchTable.value.doSearch()
//   if (ApiUtil.check(result)) {
//     ApiUtil.msg(result)
//   }
// }
// 通过安装包路径重新安装插件
async function reInstallFromPath(pluginId: number, packagePath: string) {
  const result = await apis.pluginReInstallFromPath(pluginId, packagePath)
  pluginSearchTable.value.doSearch()
  ApiUtil.msg(result)
}
</script>
<template>
  <base-subpage>
    <template #default>
      <div class="plugin-manage-container">
        <search-table
          ref="pluginSearchTable"
          v-model:page="pluginPage"
          v-model:toolbar-params="pluginSearchParams"
          class="plugin-manage-left-search-table"
          data-key="id"
          :operation-button="pluginOperationButton"
          :thead="pluginThead"
          :search="pluginQueryPage"
          :multi-select="false"
          :selectable="true"
          :page-sizes="[10, 20, 50, 100]"
          :operation-width="150"
          @row-button-clicked="handleRowButtonClicked"
          @selection-change="handleSelectionChange"
        >
          <template #toolbarMain>
            <el-button type="primary"> 安装 </el-button>
            <el-input v-model="pluginSearchParams.nonFieldKeyword" placeholder="输入名称" clearable />
          </template>
          <template #toolbarDropdown>
            <el-button></el-button>
          </template>
        </search-table>
      </div>
    </template>
    <template #dialog>
      <plugin-dialog v-model:form-data="dialogData" v-model:state="dialogState" :mode="DialogMode.VIEW" />
    </template>
  </base-subpage>
</template>

<style scoped>
.plugin-manage-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  background: #f4f4f4;
  border-radius: 6px;
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  padding: 5px;
  margin: 5px;
}
.plugin-manage-left-search-table {
  height: 100%;
  width: 100%;
}
</style>
