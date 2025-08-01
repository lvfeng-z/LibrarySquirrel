<script setup lang="ts">
import { onMounted, Ref, ref, UnwrapRef } from 'vue'
import BaseSubpage from './BaseSubpage.vue'
import SearchTable from '../common/SearchTable.vue'
import ExchangeBox from '../common/ExchangeBox.vue'
import LocalTagDialog from '../dialogs/LocalTagDialog.vue'
import lodash from 'lodash'
import ApiUtil from '../../utils/ApiUtil'
import ApiResponse from '../../model/util/ApiResponse'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import { Thead } from '../../model/util/Thead'
import SelectItem from '../../model/util/SelectItem'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import IPage from '@renderer/model/util/IPage.ts'
import Page from '@renderer/model/util/Page.ts'
import { ArrayNotEmpty, IsNullish } from '@renderer/utils/CommonUtil.ts'
import LocalTagQueryDTO from '@renderer/model/main/queryDTO/LocalTagQueryDTO.ts'
import { ElMessage } from 'element-plus'
import SiteTagQueryDTO from '@renderer/model/main/queryDTO/SiteTagQueryDTO.ts'
import LocalTagDTO from '@renderer/model/main/dto/LocalTagDTO.ts'
import LocalTagVO from '@renderer/model/main/vo/LocalTagVO.ts'
import AutoLoadSelect from '@renderer/components/common/AutoLoadSelect.vue'
import { siteQuerySelectItemPage } from '@renderer/apis/SiteApi.ts'
import { localTagQuerySelectItemPage } from '@renderer/apis/LocalTagApi.ts'

// onMounted
onMounted(() => {
  if (IsNullish(page.value.query)) {
    page.value.query = new LocalTagQueryDTO()
  }
  page.value.query.sort = [
    { key: 'updateTime', asc: false },
    { key: 'createTime', asc: false }
  ]
  localTagSearchTable.value.doSearch()
})

// 变量
// 接口
const apis = {
  localTagDeleteById: window.api.localTagDeleteById,
  localTagUpdateById: window.api.localTagUpdateById,
  localTagQueryPage: window.api.localTagQueryPage,
  localTagQueryDTOPage: window.api.localTagQueryDTOPage,
  localTagListSelectItems: window.api.localTagListSelectItems,
  localTagQuerySelectItemPage: window.api.localTagQuerySelectItemPage,
  localTagGetTree: window.api.localTagGetTree,
  siteTagUpdateBindLocalTag: window.api.siteTagUpdateBindLocalTag,
  siteQuerySelectItemPage: window.api.siteQuerySelectItemPage,
  siteTagQueryBoundOrUnboundToLocalTagPage: window.api.siteTagQueryBoundOrUnboundToLocalTagPage
}
// localTagSearchTable的组件实例
const localTagSearchTable = ref()
// siteTagExchangeBox的组件实例
const siteTagExchangeBox = ref()
// 被改变的数据行
const changedRows: Ref<UnwrapRef<LocalTagVO[]>> = ref([])
// 被选中的本地标签
const localTagSelected: Ref<UnwrapRef<LocalTagVO>> = ref(new LocalTagVO())
// 本地标签SearchTable的operationButton
const operationButton: OperationItem<LocalTagVO>[] = [
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
// 本地标签SearchTable的表头
const localTagThead: Ref<UnwrapRef<Thead[]>> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'localTagName',
    title: '名称',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    showOverflowTooltip: true
  }),
  new Thead({
    type: 'autoLoadSelect',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'baseLocalTagId',
    title: '上级标签',
    hide: false,
    width: 150,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true,
    remote: true,
    remotePaging: true,
    remotePageMethod: localTagQuerySelectItemPage,
    cacheDataKey: 'baseTag'
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'updateTime',
    title: '修改时间',
    hide: false,
    width: 200,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true
  })
])
// 本地标签SearchTable的查询参数
const localTagSearchParams: Ref<LocalTagQueryDTO> = ref(new LocalTagQueryDTO())
// 本地标签SearchTable的分页
const page: Ref<UnwrapRef<Page<LocalTagQueryDTO, LocalTagDTO>>> = ref(new Page<LocalTagQueryDTO, LocalTagDTO>())
// 本地标签弹窗的mode
const localTagDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 本地标签的对话框开关
const dialogState: Ref<UnwrapRef<boolean>> = ref(false)
// 本地标签对话框的数据
const dialogData: Ref<UnwrapRef<LocalTagVO>> = ref(new LocalTagVO())
// 站点标签ExchangeBox的upper的查询参数
const exchangeBoxUpperSearchParams: Ref<SiteTagQueryDTO> = ref(new SiteTagQueryDTO())
// 站点标签ExchangeBox的lower的查询参数
const exchangeBoxLowerSearchParams: Ref<SiteTagQueryDTO> = ref(new SiteTagQueryDTO())
// 是否禁用ExchangeBox的搜索按钮
const disableExcSearchButton: Ref<boolean> = ref(false)

// 方法
// 分页查询本地标签的函数
async function localTagQueryPage(page: Page<LocalTagQueryDTO, object>): Promise<Page<LocalTagQueryDTO, object> | undefined> {
  const response = await apis.localTagQueryDTOPage(page)
  if (ApiUtil.check(response)) {
    let responsePage = ApiUtil.data<Page<LocalTagQueryDTO, LocalTagDTO>>(response)
    if (IsNullish(responsePage)) {
      return undefined
    }
    responsePage = new Page(responsePage)
    const voList = responsePage.data?.map((item: LocalTagDTO) => new LocalTagVO(item))
    const result = responsePage.transform<LocalTagVO>()
    result.data = voList
    return result
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 处理本地标签新增按钮点击事件
async function handleCreateButtonClicked() {
  localTagDialogMode.value = DialogMode.NEW
  dialogData.value = new LocalTagVO()
  dialogState.value = true
}
// 处理本地标签数据行按钮点击事件
function handleRowButtonClicked(op: DataTableOperationResponse<LocalTagVO>) {
  switch (op.code) {
    case 'save':
      saveRowEdit(op.data)
      break
    case DialogMode.VIEW:
      localTagDialogMode.value = DialogMode.VIEW
      dialogData.value = op.data
      dialogState.value = true
      break
    case DialogMode.EDIT:
      localTagDialogMode.value = DialogMode.EDIT
      dialogData.value = op.data
      dialogState.value = true
      break
    case 'delete':
      deleteLocalTag(op.id)
      break
    default:
      break
  }
}
// 处理被选中的本地标签改变的事件
async function handleLocalTagSelectionChange(selections: LocalTagVO[]) {
  if (selections.length > 0) {
    disableExcSearchButton.value = false
    localTagSelected.value = selections[0]
    siteTagExchangeBox.value.refreshData()
  }
}
// 处理本地标签弹窗请求成功事件
function refreshTable() {
  localTagSearchTable.value.doSearch()
}
// 保存行数据编辑
async function saveRowEdit(newData: LocalTagVO) {
  const tempData = lodash.cloneDeep(newData)

  const response = await apis.localTagUpdateById(tempData)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    const index = changedRows.value.indexOf(newData)
    changedRows.value.splice(index, 1)
    refreshTable()
  }
}
// 删除本地标签
async function deleteLocalTag(id: string) {
  const response = await apis.localTagDeleteById(id)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    await localTagSearchTable.value.doSearch()
  }
}
// 处理站点标签ExchangeBox确认交换的事件
async function handleExchangeBoxConfirm(isUpper: boolean | undefined, upper: SelectItem[], lower: SelectItem[]) {
  if (IsNullish(localTagSelected.value)) {
    ElMessage({
      message: '确认修改时必须选中一个本地作者',
      type: 'warning'
    })
    return
  }

  if (IsNullish(isUpper) ? true : isUpper) {
    let upperResponse: ApiResponse
    if (ArrayNotEmpty(upper)) {
      const boundIds = upper.map((item) => item.value)
      upperResponse = await apis.siteTagUpdateBindLocalTag(localTagSelected.value.id, boundIds)
    } else {
      upperResponse = { success: true, msg: '', data: undefined }
    }
    ApiUtil.failedMsg(upperResponse)
  }
  if (IsNullish(isUpper) ? true : !isUpper) {
    let lowerResponse: ApiResponse
    if (ArrayNotEmpty(lower)) {
      const unBoundIds = lower.map((item) => item.value)
      lowerResponse = await apis.siteTagUpdateBindLocalTag(null, unBoundIds)
    } else {
      lowerResponse = { success: true, msg: '', data: undefined }
    }
    ApiUtil.failedMsg(lowerResponse)
  }
  siteTagExchangeBox.value.refreshData(isUpper)
}
// 请求站点标签分页选择列表的函数
async function requestSiteTagSelectItemPage(
  page: IPage<SiteTagQueryDTO, SelectItem>,
  bounded: boolean
): Promise<IPage<SiteTagQueryDTO, SelectItem>> {
  if (IsNullish(page.query)) {
    page.query = new SiteTagQueryDTO()
  }
  page.query.localTagId = localTagSelected.value.id
  page.query.boundOnLocalTagId = bounded
  return apis.siteTagQueryBoundOrUnboundToLocalTagPage(lodash.cloneDeep(page)).then((response) => {
    if (ApiUtil.check(response)) {
      const newPage = ApiUtil.data<IPage<SiteTagQueryDTO, SelectItem>>(response)
      return IsNullish(newPage) ? page : newPage
    } else {
      return page
    }
  })
}
</script>

<template>
  <base-subpage>
    <template #default>
      <div class="tag-manage-container">
        <div class="tag-manage-left">
          <search-table
            ref="localTagSearchTable"
            v-model:page="page"
            v-model:toolbar-params="localTagSearchParams"
            v-model:changed-rows="changedRows"
            class="tag-manage-left-search-table"
            data-key="id"
            :operation-button="operationButton"
            :thead="localTagThead"
            :search="localTagQueryPage"
            :multi-select="false"
            :selectable="true"
            :page-sizes="[10, 20, 50, 100, 1000]"
            @row-button-clicked="handleRowButtonClicked"
            @selection-change="handleLocalTagSelectionChange"
          >
            <template #toolbarMain>
              <el-button type="primary" @click="handleCreateButtonClicked">新增</el-button>
              <el-row class="local-tag-manage-search-bar">
                <el-col :span="16">
                  <el-input v-model="localTagSearchParams.localTagName" placeholder="输入标签名称" clearable />
                </el-col>
                <el-col :span="8">
                  <auto-load-select
                    v-model="localTagSearchParams.baseLocalTagId"
                    :load="localTagQuerySelectItemPage"
                    placeholder="选择上级标签"
                    remote
                    filterable
                    clearable
                  >
                    <template #default="{ list }">
                      <el-option v-for="item in list" :key="item.value" :value="item.value" :label="item.label" />
                    </template>
                  </auto-load-select>
                </el-col>
              </el-row>
            </template>
          </search-table>
        </div>
        <div class="tag-manage-right">
          <exchange-box
            ref="siteTagExchangeBox"
            v-model:upper-search-params="exchangeBoxUpperSearchParams"
            v-model:lower-search-params="exchangeBoxLowerSearchParams"
            :upper-load="(_page: IPage<SiteTagQueryDTO, SelectItem>) => requestSiteTagSelectItemPage(_page, true)"
            :lower-load="(_page: IPage<SiteTagQueryDTO, SelectItem>) => requestSiteTagSelectItemPage(_page, false)"
            :search-button-disabled="disableExcSearchButton"
            tags-gap="10px"
            @upper-confirm="(upper, lower) => handleExchangeBoxConfirm(true, upper, lower)"
            @lower-confirm="(upper, lower) => handleExchangeBoxConfirm(false, upper, lower)"
            @all-confirm="(upper, lower) => handleExchangeBoxConfirm(undefined, upper, lower)"
          >
            <template #upperToolbarMain>
              <el-row class="local-tag-manage-search-bar">
                <el-col :span="18">
                  <el-input v-model="exchangeBoxUpperSearchParams.siteTagName" placeholder="输入站点标签名称" clearable />
                </el-col>
                <el-col :span="6">
                  <auto-load-select
                    v-model="exchangeBoxUpperSearchParams.siteId"
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
              </el-row>
            </template>
            <template #lowerToolbarMain>
              <el-row class="local-tag-manage-search-bar">
                <el-col :span="18">
                  <el-input v-model="exchangeBoxLowerSearchParams.siteTagName" placeholder="输入站点标签名称" clearable />
                </el-col>
                <el-col :span="6">
                  <auto-load-select
                    v-model="exchangeBoxLowerSearchParams.siteId"
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
              </el-row>
            </template>
            <template #upperTitle>
              <div class="local-tag-manage-site-author-title">
                <span class="local-tag-manage-site-author-title-text">已绑定站点标签</span>
              </div>
            </template>
            <template #lowerTitle>
              <div class="local-tag-manage-site-author-title">
                <span class="local-tag-manage-site-author-title-text">未绑定站点标签</span>
              </div>
            </template>
          </exchange-box>
        </div>
      </div>
    </template>
    <template #dialog>
      <local-tag-dialog
        v-model:form-data="dialogData"
        v-model:state="dialogState"
        align-center
        destroy-on-close
        :mode="localTagDialogMode"
        @request-success="refreshTable"
      />
    </template>
  </base-subpage>
</template>

<style>
.tag-manage-container {
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

.tag-manage-left {
  width: calc(50% - 5px);
  height: 100%;
  margin-right: 5px;
}
.tag-manage-left-search-table {
  height: 100%;
  width: 100%;
}
.tag-manage-right {
  width: calc(50% - 5px);
  height: 100%;
  margin-left: 5px;
}
.local-tag-manage-site-author-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color);
  border-radius: 5px;
  background-color: var(--el-fill-color-blank);
}
.local-tag-manage-site-author-title-text {
  text-align: center;
  writing-mode: vertical-lr;
  color: var(--el-text-color-regular);
}
.local-tag-manage-search-bar {
  flex-grow: 1;
}
</style>
