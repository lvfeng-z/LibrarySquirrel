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
import { InputBox } from '../../model/util/InputBox'
import SelectItem from '../../model/util/SelectItem'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import LocalTag from '../../model/main/entity/LocalTag.ts'
import TreeSelectNode from '@renderer/model/util/TreeSelectNode.ts'
import Page from '@renderer/model/util/Page.ts'
import StringUtil from '@renderer/utils/StringUtil.ts'
import SiteQueryDTO from '@renderer/model/main/queryDTO/SiteQueryDTO.ts'
import Site from '@renderer/model/main/entity/Site.ts'
import { ArrayNotEmpty, IsNullish } from '@renderer/utils/CommonUtil.ts'
import LocalTagQueryDTO from '@renderer/model/main/queryDTO/LocalTagQueryDTO.ts'
import IPage from '@renderer/model/util/IPage.ts'
import { ElMessage } from 'element-plus'
import SiteTagQueryDTO from '@renderer/model/main/queryDTO/SiteTagQueryDTO.ts'
import LocalTagDTO from '@renderer/model/main/dto/LocalTagDTO.ts'
import LocalTagVO from '@renderer/model/main/vo/LocalTagVO.ts'

// onMounted
onMounted(() => {
  if (IsNullish(page.value.query)) {
    page.value.query = new LocalTagQueryDTO()
  }
  page.value.query.sort = { updateTime: false, createTime: false }
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
const changedRows: Ref<UnwrapRef<LocalTag[]>> = ref([])
// 被选中的本地标签
const localTagSelected: Ref<UnwrapRef<LocalTag>> = ref(new LocalTag())
// 本地标签SearchTable的operationButton
const operationButton: OperationItem<LocalTag>[] = [
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
    overHide: true
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
    overHide: true,
    remote: true,
    remotePaging: true,
    remotePageMethod: requestApi,
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
    overHide: true
  })
])
// 本地标签SearchTable的mainInputBoxes
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'localTagName',
    type: 'text',
    placeholder: '输入本地标签的名称',
    inputSpan: 10
  }),
  new InputBox({
    name: 'baseLocalTagId',
    type: 'autoLoadSelect',
    placeholder: '选择上级标签',
    inputSpan: 8,
    remote: true,
    remotePaging: true,
    remotePageMethod: requestApi
  })
])
// 本地标签SearchTable的dropDownInputBoxes
const dropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  new InputBox({
    name: 'id',
    label: 'id',
    type: 'text',
    placeholder: '内部id'
  })
])
// 本地标签SearchTable的分页
const page: Ref<UnwrapRef<Page<LocalTagQueryDTO, LocalTag>>> = ref(new Page<LocalTagQueryDTO, LocalTag>())
// 本地标签弹窗的mode
const localTagDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 本地标签的对话框开关
const dialogState: Ref<UnwrapRef<boolean>> = ref(false)
// 本地标签对话框的数据
const dialogData: Ref<UnwrapRef<LocalTag>> = ref(new LocalTag())
// 站点标签ExchangeBox的mainInputBoxes
const exchangeBoxMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'siteTagName',
    type: 'text',
    placeholder: '输入站点标签名称',
    inputSpan: 12
  }),
  new InputBox({
    name: 'siteId',
    type: 'select',
    placeholder: '选择站点',
    remote: true,
    remoteMethod: requestSiteQuerySelectItemPage,
    inputSpan: 9
  })
])
// 站点标签ExchangeBox的DropDownInputBoxes
const exchangeBoxDropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'id',
    type: 'text',
    placeholder: '输入id',
    label: 'id',
    inputSpan: 22
  })
])
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
// 请求选择项分页接口
async function requestApi(page: IPage<unknown, SelectItem>, input?: string): Promise<IPage<unknown, SelectItem>> {
  page.query = { localTagName: input }
  const response = await apis.localTagQuerySelectItemPage(page)

  // 解析响应值
  if (ApiUtil.check(response)) {
    const nextPage = ApiUtil.data<Page<unknown, SelectItem>>(response)
    return IsNullish(nextPage) ? page : nextPage
  } else {
    ApiUtil.failedMsg(response)
    return page
  }
}
// 请求站点分页列表的函数
async function requestSiteQuerySelectItemPage(query: string) {
  const sitePage: Page<SiteQueryDTO, Site> = new Page()
  if (StringUtil.isNotBlank(query)) {
    sitePage.query = { siteName: query }
  }
  const response = await apis.siteQuerySelectItemPage(sitePage)
  if (ApiUtil.check(response)) {
    const newSitePage = ApiUtil.data(response) as Page<LocalTagQueryDTO, object>
    return newSitePage.data as TreeSelectNode[]
  } else {
    return []
  }
}
// 处理本地标签新增按钮点击事件
async function handleCreateButtonClicked() {
  localTagDialogMode.value = DialogMode.NEW
  dialogData.value = new LocalTag()
  dialogState.value = true
}
// 处理本地标签数据行按钮点击事件
function handleRowButtonClicked(op: DataTableOperationResponse<LocalTag>) {
  switch (op.code) {
    case 'save':
      saveRowEdit(op.data as LocalTag)
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
async function handleLocalTagSelectionChange(selections: LocalTag[]) {
  if (selections.length > 0) {
    disableExcSearchButton.value = false
    localTagSelected.value = selections[0]
    siteTagExchangeBox.value.refreshData()
  }
}
// 处理本地标签弹窗请求成功事件
function handleDialogRequestSuccess() {
  localTagSearchTable.value.doSearch()
}
// 保存行数据编辑
async function saveRowEdit(newData: LocalTag) {
  const tempData = lodash.cloneDeep(newData)

  const response = await apis.localTagUpdateById(tempData)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    const index = changedRows.value.indexOf(newData)
    changedRows.value.splice(index, 1)
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
      <div class="tag-manage-container rounded-margin-box">
        <div class="tag-manage-left">
          <search-table
            ref="localTagSearchTable"
            v-model:page="page"
            v-model:changed-rows="changedRows"
            class="tag-manage-left-search-table"
            key-of-data="id"
            :create-button="true"
            :operation-button="operationButton"
            :thead="localTagThead"
            :main-input-boxes="mainInputBoxes"
            :drop-down-input-boxes="dropDownInputBoxes"
            :search="localTagQueryPage"
            :multi-select="false"
            :selectable="true"
            :page-sizes="[10, 20, 50, 100, 1000]"
            @create-button-clicked="handleCreateButtonClicked"
            @row-button-clicked="handleRowButtonClicked"
            @selection-change="handleLocalTagSelectionChange"
          ></search-table>
        </div>
        <div class="tag-manage-right">
          <exchange-box
            ref="siteTagExchangeBox"
            :upper-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
            :upper-main-input-boxes="exchangeBoxMainInputBoxes"
            :upper-load="(_page: IPage<SiteTagQueryDTO, SelectItem>) => requestSiteTagSelectItemPage(_page, true)"
            :lower-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
            :lower-main-input-boxes="exchangeBoxMainInputBoxes"
            :lower-load="(_page: IPage<SiteTagQueryDTO, SelectItem>) => requestSiteTagSelectItemPage(_page, false)"
            :search-button-disabled="disableExcSearchButton"
            @upper-confirm="(upper, lower) => handleExchangeBoxConfirm(true, upper, lower)"
            @lower-confirm="(upper, lower) => handleExchangeBoxConfirm(false, upper, lower)"
            @all-confirm="(upper, lower) => handleExchangeBoxConfirm(undefined, upper, lower)"
          >
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
        @request-success="handleDialogRequestSuccess"
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
  width: 100%;
  height: 100%;
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
</style>
