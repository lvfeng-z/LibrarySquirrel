<script setup lang="ts">
import { onMounted, Ref, ref, UnwrapRef } from 'vue'
import BaseSubpage from './BaseSubpage.vue'
import SearchTable from '../common/SearchTable.vue'
import SiteTagDialog from '../dialogs/SiteTagDialog.vue'
import lodash from 'lodash'
import ApiUtil from '../../utils/ApiUtil'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import { Thead } from '../../model/util/Thead'
import { InputBox } from '../../model/util/InputBox'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import Page from '@renderer/model/util/Page.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import SiteTagQueryDTO from '@renderer/model/main/queryDTO/SiteTagQueryDTO.ts'
import SiteTagLocalRelateDTO from '@renderer/model/main/dto/SiteTagLocalRelateDTO.ts'
import IPage from '@renderer/model/util/IPage.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'
import SiteTagVO from '@renderer/model/main/vo/SiteTagVO.ts'

// onMounted
onMounted(() => {
  if (IsNullish(page.value.query)) {
    page.value.query = new SiteTagQueryDTO()
  }
  page.value.query.sort = [
    { key: 'updateTime', asc: false },
    { key: 'createTime', asc: false }
  ]
  siteTagSearchTable.value.doSearch()
})

// 变量
// 接口
const apis = {
  localTagQuerySelectItemPage: window.api.localTagQuerySelectItemPage,
  siteTagCreateAndBindSameNameLocalTag: window.api.siteTagCreateAndBindSameNameLocalTag,
  siteTagDeleteById: window.api.siteTagDeleteById,
  siteTagUpdateById: window.api.siteTagUpdateById,
  siteTagQueryLocalRelateDTOPage: window.api.siteTagQueryLocalRelateDTOPage
}
// siteTagSearchTable的组件实例
const siteTagSearchTable = ref()
// 被改变的数据行
const changedRows: Ref<SiteTagLocalRelateDTO[]> = ref([])
// 站点标签SearchTable的operationButton
const operationButton: OperationItem<SiteTagLocalRelateDTO>[] = [
  {
    label: '保存',
    icon: 'Checked',
    buttonType: 'primary',
    code: 'save',
    rule: (row) => changedRows.value.includes(row)
  },
  {
    label: '创建同名本地标签',
    icon: 'CirclePlusFilled',
    buttonType: 'primary',
    code: 'create',
    rule: (row) => !row.hasSameNameLocalTag
  },
  { label: '查看', icon: 'view', code: DialogMode.VIEW },
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
  { label: '删除', icon: 'delete', code: 'delete' }
]
// 站点标签SearchTable的表头
const siteTagThead: Ref<Thead[]> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'siteTagName',
    title: '名称',
    hide: false,
    width: 250,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'textarea',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'description',
    title: '详情',
    hide: false,
    width: 400,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'autoLoadSelect',
    editMethod: 'replace',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'localTagId',
    title: '本地标签',
    hide: false,
    width: 150,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true,
    remote: true,
    remotePaging: true,
    remotePageMethod: localTagQuerySelectItemPage,
    cacheDataKey: 'localTagSelectItem'
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
// 站点标签SearchTable的mainInputBoxes
const mainInputBoxes: Ref<InputBox[]> = ref<InputBox[]>([
  new InputBox({
    name: 'siteTagName',
    type: 'text',
    placeholder: '输入站点标签的名称',
    inputSpan: 10
  })
])
// 站点标签SearchTable的dropDownInputBoxes
const dropDownInputBoxes: Ref<InputBox[]> = ref([
  new InputBox({
    name: 'id',
    label: 'id',
    type: 'text',
    placeholder: '内部id'
  })
])
// 站点标签SearchTable的分页
const page: Ref<UnwrapRef<Page<SiteTagQueryDTO, SiteTagLocalRelateDTO>>> = ref(new Page<SiteTagQueryDTO, SiteTagLocalRelateDTO>())
// 站点标签弹窗的mode
const siteTagDialogMode: Ref<DialogMode> = ref(DialogMode.EDIT)
// 站点标签的对话框开关
const dialogState: Ref<boolean> = ref(false)
// 站点标签对话框的数据
const dialogData: Ref<SiteTagLocalRelateDTO> = ref(new SiteTagLocalRelateDTO())

// 方法
// 分页查询站点标签的函数
async function siteTagQueryPage(page: Page<SiteTagQueryDTO, object>): Promise<Page<SiteTagQueryDTO, SiteTagVO> | undefined> {
  const response = await apis.siteTagQueryLocalRelateDTOPage(page)
  if (ApiUtil.check(response)) {
    let responsePage = ApiUtil.data<Page<SiteTagQueryDTO, SiteTagLocalRelateDTO>>(response)
    if (IsNullish(responsePage)) {
      return undefined
    }
    responsePage = new Page(responsePage)
    const relateDTOList = responsePage.data?.map((item: SiteTagLocalRelateDTO) => new SiteTagLocalRelateDTO(item))
    let finalList: SiteTagVO[] = []
    if (ArrayNotEmpty(relateDTOList)) {
      finalList = relateDTOList.map((dto) => {
        const tempVO = new SiteTagVO(dto)
        const tempId = dto.localTag?.id
        const tempName = dto.localTag?.localTagName
        if (NotNullish(tempId)) {
          tempVO.localTagSelectItem = new SelectItem({ value: tempId, label: IsNullish(tempName) ? '' : tempName })
        }
        return tempVO
      })
    }
    const result = responsePage.transform<SiteTagVO>()
    result.data = finalList
    return result
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 处理站点标签新增按钮点击事件
async function handleCreateButtonClicked() {
  siteTagDialogMode.value = DialogMode.NEW
  dialogData.value = new SiteTagLocalRelateDTO()
  dialogState.value = true
}
// 处理站点标签数据行按钮点击事件
function handleRowButtonClicked(op: DataTableOperationResponse<SiteTagVO>) {
  switch (op.code) {
    case 'create':
      apis.siteTagCreateAndBindSameNameLocalTag(lodash.cloneDeep(op.data)).then(() => siteTagSearchTable.value.doSearch())
      break
    case 'save':
      saveRowEdit(op.data)
      break
    case DialogMode.VIEW:
      siteTagDialogMode.value = DialogMode.VIEW
      dialogData.value = op.data
      dialogState.value = true
      break
    case DialogMode.EDIT:
      siteTagDialogMode.value = DialogMode.EDIT
      dialogData.value = op.data
      dialogState.value = true
      break
    case 'delete':
      deleteSiteTag(op.id)
      break
    default:
      break
  }
}
// 处理站点标签弹窗请求成功事件
function refreshTable() {
  siteTagSearchTable.value.doSearch()
}
// 删除站点标签
async function deleteSiteTag(id: string) {
  const response = await apis.siteTagDeleteById(id)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    await siteTagSearchTable.value.doSearch()
  }
}
// 请求标签选择项分页接口
async function localTagQuerySelectItemPage(page: IPage<unknown, SelectItem>, input?: string): Promise<IPage<unknown, SelectItem>> {
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
// 保存行数据编辑
async function saveRowEdit(newData: SiteTagVO) {
  const tempData = lodash.cloneDeep(newData)

  const response = await apis.siteTagUpdateById(tempData)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    const index = changedRows.value.indexOf(newData)
    changedRows.value.splice(index, 1)
    refreshTable()
  }
}
</script>

<template>
  <base-subpage>
    <template #default>
      <div class="tag-manage-container rounded-margin-box">
        <search-table
          ref="siteTagSearchTable"
          v-model:page="page"
          v-model:changed-rows="changedRows"
          class="tag-manage-search-table"
          key-of-data="id"
          :create-button="true"
          :operation-button="operationButton"
          :thead="siteTagThead"
          :main-input-boxes="mainInputBoxes"
          :drop-down-input-boxes="dropDownInputBoxes"
          :search="siteTagQueryPage"
          :multi-select="false"
          :selectable="true"
          :page-sizes="[10, 20, 50, 100, 1000]"
          :operation-width="205"
          @create-button-clicked="handleCreateButtonClicked"
          @row-button-clicked="handleRowButtonClicked"
        ></search-table>
        <el-drawer> </el-drawer>
      </div>
    </template>
    <template #dialog>
      <site-tag-dialog
        v-model:form-data="dialogData"
        v-model:state="dialogState"
        align-center
        destroy-on-close
        :mode="siteTagDialogMode"
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
  width: 100%;
  height: 100%;
}
.tag-manage-search-table {
  height: 100%;
  width: 100%;
}
</style>
