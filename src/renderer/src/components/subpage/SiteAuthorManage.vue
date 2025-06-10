<script setup lang="ts">
import { onMounted, Ref, ref, UnwrapRef } from 'vue'
import BaseSubpage from './BaseSubpage.vue'
import SearchTable from '../common/SearchTable.vue'
import lodash from 'lodash'
import ApiUtil from '../../utils/ApiUtil'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import { Thead } from '../../model/util/Thead'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import Page from '@renderer/model/util/Page.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import SiteAuthorQueryDTO from '@renderer/model/main/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthorLocalRelateDTO from '@renderer/model/main/dto/SiteAuthorLocalRelateDTO.ts'
import IPage from '@renderer/model/util/IPage.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'
import SiteAuthorVO from '@renderer/model/main/vo/SiteAuthorVO.ts'
import SiteAuthorDialog from '@renderer/components/dialogs/SiteAuthorDialog.vue'
import SiteAuthor from '@renderer/model/main/entity/SiteAuthor.ts'
import { siteQuerySelectItemPage } from '@renderer/apis/SiteApi.ts'
import AutoLoadSelect from '@renderer/components/common/AutoLoadSelect.vue'

// onMounted
onMounted(() => {
  if (IsNullish(page.value.query)) {
    page.value.query = new SiteAuthorQueryDTO()
  }
  page.value.query.sort = [
    { key: 'updateTime', asc: false },
    { key: 'createTime', asc: false }
  ]
  siteAuthorSearchTable.value.doSearch()
})

// 变量
// 接口
const apis = {
  localAuthorQuerySelectItemPage: window.api.localAuthorQuerySelectItemPage,
  siteAuthorCreateAndBindSameNameLocalAuthor: window.api.siteAuthorCreateAndBindSameNameLocalAuthor,
  siteAuthorDeleteById: window.api.siteAuthorDeleteById,
  siteAuthorUpdateById: window.api.siteAuthorUpdateById,
  siteAuthorQueryLocalRelateDTOPage: window.api.siteAuthorQueryLocalRelateDTOPage
}
// siteAuthorSearchTable的组件实例
const siteAuthorSearchTable = ref()
// 被改变的数据行
const changedRows: Ref<SiteAuthorLocalRelateDTO[]> = ref([])
// 站点作者SearchTable的operationButton
const operationButton: OperationItem<SiteAuthorLocalRelateDTO>[] = [
  {
    label: '保存',
    icon: 'Checked',
    buttonType: 'primary',
    code: 'save',
    rule: (row) => changedRows.value.includes(row)
  },
  {
    label: '创建同名本地作者',
    icon: 'CirclePlusFilled',
    buttonType: 'primary',
    code: 'create',
    rule: (row) => !row.hasSameNameLocalAuthor
  },
  { label: '查看', icon: 'view', code: DialogMode.VIEW },
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
  { label: '删除', icon: 'delete', code: 'delete' }
]
// 站点作者SearchTable的表头
const siteAuthorThead: Ref<Thead[]> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'authorName',
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
    key: 'introduce',
    title: '介绍',
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
    key: 'localAuthorId',
    title: '本地作者',
    hide: false,
    width: 150,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true,
    remote: true,
    remotePaging: true,
    remotePageMethod: localAuthorQuerySelectItemPage,
    cacheDataKey: 'localAuthorSelectItem'
  }),
  new Thead({
    type: 'autoLoadSelect',
    editMethod: 'replace',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'siteId',
    title: '站点',
    hide: false,
    width: 150,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true,
    remote: true,
    remotePaging: true,
    remotePageMethod: siteQuerySelectItemPage,
    cacheDataKey: 'siteSelectItem'
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
// 站点作者SearchTable的查询参数
const siteAuthorSearchParams: Ref<SiteAuthorQueryDTO> = ref(new SiteAuthorQueryDTO())
// 站点作者SearchTable的分页
const page: Ref<UnwrapRef<Page<SiteAuthorQueryDTO, SiteAuthorLocalRelateDTO>>> = ref(
  new Page<SiteAuthorQueryDTO, SiteAuthorLocalRelateDTO>()
)
// 站点作者弹窗的mode
const siteAuthorDialogMode: Ref<DialogMode> = ref(DialogMode.EDIT)
// 站点作者的对话框开关
const dialogState: Ref<boolean> = ref(false)
// 站点作者对话框的数据
const dialogData: Ref<SiteAuthorLocalRelateDTO> = ref(new SiteAuthorLocalRelateDTO())

// 方法
// 分页查询站点作者的函数
async function siteAuthorQueryPage(
  page: Page<SiteAuthorQueryDTO, object>
): Promise<Page<SiteAuthorQueryDTO, SiteAuthorVO> | undefined> {
  const response = await apis.siteAuthorQueryLocalRelateDTOPage(page)
  if (ApiUtil.check(response)) {
    let responsePage = ApiUtil.data<Page<SiteAuthorQueryDTO, SiteAuthorLocalRelateDTO>>(response)
    if (IsNullish(responsePage)) {
      return undefined
    }
    responsePage = new Page(responsePage)
    const relateDTOList = responsePage.data?.map((item: SiteAuthorLocalRelateDTO) => new SiteAuthorLocalRelateDTO(item))
    let finalList: SiteAuthorVO[] = []
    if (ArrayNotEmpty(relateDTOList)) {
      finalList = relateDTOList.map((dto) => {
        const tempVO = new SiteAuthorVO(dto)
        const tempId = dto.localAuthor?.id
        const tempName = dto.localAuthor?.authorName
        if (NotNullish(tempId)) {
          tempVO.localAuthorSelectItem = new SelectItem({ value: tempId, label: IsNullish(tempName) ? '' : tempName })
        }
        return tempVO
      })
    }
    const result = responsePage.transform<SiteAuthorVO>()
    result.data = finalList
    return result
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 处理站点作者新增按钮点击事件
async function handleCreateButtonClicked() {
  siteAuthorDialogMode.value = DialogMode.NEW
  dialogData.value = new SiteAuthorLocalRelateDTO()
  dialogState.value = true
}
// 处理站点作者数据行按钮点击事件
async function handleRowButtonClicked(op: DataTableOperationResponse<SiteAuthorVO>) {
  switch (op.code) {
    case 'create':
      await creatSameNameLocalAuthorAndBind(lodash.cloneDeep(op.data))
      siteAuthorSearchTable.value.doSearch()
      break
    case 'save':
      saveRowEdit(op.data)
      break
    case DialogMode.VIEW:
      siteAuthorDialogMode.value = DialogMode.VIEW
      dialogData.value = op.data
      dialogState.value = true
      break
    case DialogMode.EDIT:
      siteAuthorDialogMode.value = DialogMode.EDIT
      dialogData.value = op.data
      dialogState.value = true
      break
    case 'delete':
      deleteSiteAuthor(op.id)
      break
    default:
      break
  }
}
// 处理站点作者弹窗请求成功事件
function refreshTable() {
  siteAuthorSearchTable.value.doSearch()
}
// 删除站点作者
async function deleteSiteAuthor(id: string) {
  const response = await apis.siteAuthorDeleteById(id)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    await siteAuthorSearchTable.value.doSearch()
  }
}
// 请求作者选择项分页接口
async function localAuthorQuerySelectItemPage(page: IPage<unknown, SelectItem>, input?: string): Promise<IPage<unknown, SelectItem>> {
  page.query = { localAuthorName: input }
  const response = await apis.localAuthorQuerySelectItemPage(page)

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
async function saveRowEdit(newData: SiteAuthorVO) {
  const tempData = lodash.cloneDeep(newData)

  const response = await apis.siteAuthorUpdateById(tempData)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    const index = changedRows.value.indexOf(newData)
    changedRows.value.splice(index, 1)
    refreshTable()
  }
}
// 创建同名本地作者并绑定
async function creatSameNameLocalAuthorAndBind(siteAuthor: SiteAuthor) {
  const response = await apis.siteAuthorCreateAndBindSameNameLocalAuthor(siteAuthor)
  if (!ApiUtil.check(response)) {
    ApiUtil.msg(response)
  }
}
</script>

<template>
  <base-subpage>
    <template #default>
      <div class="tag-manage-container">
        <search-table
          ref="siteAuthorSearchTable"
          v-model:page="page"
          v-model:search-params="siteAuthorSearchParams"
          v-model:changed-rows="changedRows"
          class="tag-manage-search-table"
          data-key="id"
          :operation-button="operationButton"
          :thead="siteAuthorThead"
          :search="siteAuthorQueryPage"
          :multi-select="true"
          :selectable="true"
          :page-sizes="[10, 20, 50, 100, 1000]"
          :operation-width="205"
          @row-button-clicked="handleRowButtonClicked"
        >
          <template #toolbarMain>
            <el-button type="primary" @click="handleCreateButtonClicked">新增</el-button>
            <el-row class="site-author-manage-search-bar">
              <el-col :span="20">
                <el-input v-model="siteAuthorSearchParams.authorName" placeholder="输入作者名称" clearable />
              </el-col>
              <el-col :span="4">
                <auto-load-select
                  v-model="siteAuthorSearchParams.siteId"
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
        </search-table>
        <el-drawer> </el-drawer>
      </div>
    </template>
    <template #dialog>
      <site-author-dialog
        v-model:form-data="dialogData"
        v-model:state="dialogState"
        align-center
        destroy-on-close
        :mode="siteAuthorDialogMode"
        @request-success="refreshTable"
      />
    </template>
  </base-subpage>
</template>

<style>
.tag-manage-container {
  background: #f4f4f4;
  border-radius: 6px;
  display: flex;
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  padding: 5px;
  margin: 5px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}
.tag-manage-search-table {
  height: 100%;
  width: 100%;
}
.site-author-manage-search-bar {
  flex-grow: 1;
}
</style>
