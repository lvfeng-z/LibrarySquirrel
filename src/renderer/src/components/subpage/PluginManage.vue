<script setup lang="ts">
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'
import SearchTable from '@renderer/components/common/SearchTable.vue'
import { onMounted, ref, Ref, UnwrapRef } from 'vue'
import Page from '@renderer/model/util/Page.ts'
import OperationItem from '@renderer/model/util/OperationItem.ts'
import DialogMode from '@renderer/model/util/DialogMode.ts'
import { Thead } from '@renderer/model/util/Thead.ts'
import { InputBox } from '@renderer/model/util/InputBox.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import DataTableOperationResponse from '@renderer/model/util/DataTableOperationResponse.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'
import Plugin from '@renderer/model/main/entity/Plugin.ts'
import PluginQueryDTO from '@renderer/model/main/queryDTO/PluginQueryDTO.ts'

// onMounted
onMounted(() => {
  if (IsNullish(pluginPage.value.query)) {
    pluginPage.value.query = new PluginQueryDTO()
  }
  pluginPage.value.query.sort = { updateTime: false, createTime: false }
  pluginSearchTable.value.doSearch()
})

// 变量
const apis = {
  pluginQueryPage: window.api.pluginQueryPage,
  pluginReInstall: window.api.pluginReInstall,
  pluginUnInstall: window.api.pluginUnInstall
}
// 插件数据表组件的实例
const pluginSearchTable = ref()
// 插件域名数据表组件的实例
const pluginDomainSearchTable = ref()
// 插件分页参数
const pluginPage: Ref<Page<PluginQueryDTO, Plugin>> = ref(new Page<PluginQueryDTO, Plugin>())
// 插件被修改的行
const pluginChangedRows: Ref<Plugin[]> = ref([])
// 插件操作栏按钮
const pluginOperationButton: OperationItem<Plugin>[] = [
  { label: '修复', icon: 'Refresh', code: 'reinstall' },
  { label: '卸载', icon: 'delete', code: 'uninstall' }
]
// 插件的表头
const pluginThead: Ref<UnwrapRef<Thead[]>> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    name: 'name',
    label: '名称',
    hide: false,
    width: 100,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    name: 'author',
    label: '作者',
    hide: false,
    width: 400,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true,
    useLoad: true
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    name: 'version',
    label: '版本号',
    hide: false,
    width: 200,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    dblclickToEdit: true,
    name: 'createTime',
    label: '安装时间',
    hide: false,
    width: 200,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  })
])
// 插件的查询参数
const pluginMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'keyword',
    type: 'text',
    placeholder: '输入插件名称、作者查询',
    inputSpan: 18
  })
])
// 插件弹窗的模式
const pluginDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 插件对话框开关
const pluginDialogState: Ref<boolean> = ref(false)
// 插件对话框的数据
const pluginDialogData: Ref<UnwrapRef<Plugin>> = ref(new Plugin())
// 被选中的插件
const pluginSelected: Ref<UnwrapRef<Plugin>> = ref(new Plugin())

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
// 处理插件新增按钮点击事件
async function handleCreateButtonClicked() {
  pluginDialogMode.value = DialogMode.NEW
  pluginDialogData.value = new Plugin()
  pluginDialogState.value = true
}
// 处理插件数据行按钮点击事件
function handleRowButtonClicked(op: DataTableOperationResponse<Plugin>) {
  // TODO 添加重装和卸载的响应
  switch (op.code) {
    case 'reinstall':
      apis.pluginReInstall(op.id)
      break
    case 'uninstall':
      apis.pluginUnInstall(op.id)
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
</script>
<template>
  <base-subpage>
    <template #default>
      <div class="plugin-manage-container rounded-margin-box">
        <search-table
          ref="pluginSearchTable"
          v-model:page="pluginPage"
          v-model:changed-rows="pluginChangedRows"
          class="plugin-manage-left-search-table"
          key-of-data="id"
          :create-button="true"
          :operation-button="pluginOperationButton"
          :thead="pluginThead"
          :main-input-boxes="pluginMainInputBoxes"
          :drop-down-input-boxes="[]"
          :search="pluginQueryPage"
          :multi-select="false"
          :selectable="true"
          :page-sizes="[10, 20, 50, 100]"
          @create-button-clicked="handleCreateButtonClicked"
          @row-button-clicked="handleRowButtonClicked"
          @selection-change="handleSelectionChange"
        >
        </search-table>
      </div>
    </template>
    <template #dialog></template>
  </base-subpage>
</template>

<style scoped>
.plugin-manage-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}
.plugin-manage-left-search-table {
  height: 100%;
  width: 100%;
}
</style>
