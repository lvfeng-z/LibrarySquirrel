<script setup lang="ts">
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'
import SearchTable from '@renderer/components/common/SearchTable.vue'
import { computed, onMounted, ref, Ref, toRaw, UnwrapRef } from 'vue'
import Page from '@renderer/model/util/Page.ts'
import SiteQueryDTO from '@renderer/model/main/queryDTO/SiteQueryDTO.ts'
import OperationItem from '@renderer/model/util/OperationItem.ts'
import DialogMode from '@renderer/model/util/DialogMode.ts'
import { Thead } from '@renderer/model/util/Thead.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import DataTableOperationResponse from '@renderer/model/util/DataTableOperationResponse.ts'
import lodash from 'lodash'
import Site from '@renderer/model/main/entity/Site.ts'
import { ArrayNotEmpty, IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import SiteDialog from '@renderer/components/dialogs/SiteDialog.vue'
import SiteDomainQueryDTO from '@renderer/model/main/queryDTO/SiteDomainQueryDTO.ts'
import SiteDomainDTO from '@renderer/model/main/dto/SiteDomainDTO.ts'
import SiteDomainDialog from '@renderer/components/dialogs/SiteDomainDialog.vue'
import { ElMessage } from 'element-plus'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore.ts'
import SiteDomain from '@renderer/model/main/entity/SiteDomain.ts'

// onMounted
onMounted(() => {
  if (IsNullish(sitePage.value.query)) {
    sitePage.value.query = new SiteQueryDTO()
  }
  sitePage.value.query.sort = [
    { key: 'updateTime', asc: false },
    { key: 'createTime', asc: false }
  ]
  siteSearchTable.value.doSearch()
  const focusOnDomains = toRaw(usePageStatesStore().pageStates.siteManage.focusOnDomains)
  if (ArrayNotEmpty(focusOnDomains)) {
    siteDomainSearchParams.value.domains = focusOnDomains
    siteDomainSearchTable.value.doSearch()
  }
})

// 变量
const apis = {
  siteDeleteById: window.api.siteDeleteById,
  siteQueryPage: window.api.siteQueryPage,
  siteUpdateById: window.api.siteUpdateById,
  siteDomainDeleteById: window.api.siteDomainDeleteById,
  siteDomainQueryDTOPage: window.api.siteDomainQueryDTOPage,
  siteDomainSave: window.api.siteDomainSave,
  siteDomainUpdateById: window.api.siteDomainUpdateById,
  siteDomainQueryDTOPageBySite: window.api.siteDomainQueryDTOPageBySite
}
// 站点数据表组件的实例
const siteSearchTable = ref()
// 站点侧边数据表组件的实例
const siteDrawerSearchTable = ref()
// 站点域名数据表组件的实例
const siteDomainSearchTable = ref()
// 站点域名侧边数据表组件的实例
const siteDomainDrawerSearchTable = ref()
// 是否调转站点和域名
const reversed: Ref<boolean> = ref(false)
// 侧边栏开关
const drawerState: Ref<boolean> = ref(false)
// 站点分页参数
const sitePage: Ref<Page<SiteQueryDTO, Site>> = ref(new Page<SiteQueryDTO, Site>())
// 站点被修改的行
const siteChangedRows: Ref<Site[]> = ref([])
// 站点操作栏按钮
const siteOperationButton: OperationItem<Site>[] = [
  {
    label: '保存',
    icon: 'Checked',
    buttonType: 'primary',
    code: 'save',
    rule: (row) => siteChangedRows.value.includes(row)
  },
  { label: '绑定域名', icon: 'Paperclip', code: 'openSiteDomainDrawer', rule: () => !reversed.value },
  { label: '解绑', icon: 'DocumentDelete', code: 'unbind', rule: () => reversed.value },
  { label: '查看', icon: 'view', code: DialogMode.VIEW },
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
  { label: '删除', icon: 'delete', code: 'delete' }
]
// 站点的表头
const siteThead: Ref<Thead<Site>[]> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'siteName',
    title: '名称',
    hide: false,
    width: 100,
    headerAlign: 'center',
    dataAlign: 'center',
    showOverflowTooltip: true
  }),
  new Thead({
    type: 'textarea',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'siteDescription',
    title: '描述',
    hide: false,
    width: 400,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true
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
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'createTime',
    title: '创建时间',
    hide: false,
    width: 200,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true
  })
])
// 站点的查询参数
const siteSearchParams: Ref<SiteQueryDTO> = ref(new SiteQueryDTO())
// 站点弹窗的模式
const siteDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 站点对话框开关
const siteDialogState: Ref<boolean> = ref(false)
// 站点对话框的数据
const siteDialogData: Ref<UnwrapRef<Site>> = ref(new Site())
// 被选中的站点
const siteSelected: Ref<Site | undefined> = computed(() => {
  if (IsNullish(siteSearchTable.value)) {
    return undefined
  }
  const temp = siteSearchTable.value.getSelectionRows()
  if (ArrayNotEmpty(temp)) {
    return temp[0] as Site
  } else {
    return undefined
  }
})
// 站点搜索按钮的开关
const siteSearchButtonDisabled = computed(() => reversed.value && IsNullish(siteDomainSelected.value))
// 站点侧边栏的分页参数
const siteDrawerPage: Ref<Page<SiteQueryDTO, Site>> = ref(new Page<SiteQueryDTO, Site>())
// 站点侧边栏的查询参数
const siteDrawerSearchParams: Ref<SiteQueryDTO> = ref(new SiteQueryDTO())
// 站点侧边栏的操作栏按钮
const siteDrawerOperationButton: OperationItem<Site>[] = [
  { label: '绑定', icon: 'Paperclip', code: 'bind', rule: (row) => reversed.value && row.id !== siteDomainSelected.value?.siteId },
  {
    label: '解绑',
    icon: 'DocumentDelete',
    code: 'unbind',
    buttonType: 'danger',
    rule: (row) => reversed.value && row.id === siteDomainSelected.value?.siteId
  },
  { label: '查看', icon: 'view', code: DialogMode.VIEW }
]
// 站点域名分页参数
const siteDomainPage: Ref<Page<SiteDomainQueryDTO, SiteDomainDTO>> = ref(new Page<SiteDomainQueryDTO, SiteDomainDTO>())
// 站点域名被修改的行
const siteDomainChangedRows: Ref<SiteDomainDTO[]> = ref([])
// 站点域名操作栏按钮
const siteDomainOperationButton: OperationItem<SiteDomainDTO>[] = [
  {
    label: '保存',
    icon: 'Checked',
    buttonType: 'primary',
    code: 'save',
    rule: (row) => siteDomainChangedRows.value.includes(row)
  },
  { label: '绑定', icon: 'Paperclip', code: 'openSiteDrawer', rule: () => reversed.value },
  { label: '解绑', icon: 'DocumentDelete', code: 'unbind', rule: () => !reversed.value },
  { label: '查看', icon: 'view', code: DialogMode.VIEW },
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
  { label: '删除', icon: 'delete', code: 'delete' }
]
// 站点域名的表头
const siteDomainThead: Ref<Thead<SiteDomainDTO>[]> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'domain',
    title: '域名',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    showOverflowTooltip: true
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: false,
    key: 'site.siteName',
    title: '对应站点',
    hide: false,
    width: 150,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true
  }),
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'homepage',
    title: '主页',
    hide: false,
    width: 150,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true
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
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'createTime',
    title: '创建时间',
    hide: false,
    width: 200,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    showOverflowTooltip: true
  })
])
// 站点域名的查询参数
const siteDomainSearchParams: Ref<SiteDomainQueryDTO> = ref(new SiteDomainQueryDTO())
// 被选中的站点域名
const siteDomainSelected: Ref<SiteDomain | undefined> = computed(() => {
  if (IsNullish(siteDomainSearchTable.value)) {
    return undefined
  }
  const temp = siteDomainSearchTable.value.getSelectionRows()
  if (ArrayNotEmpty(temp)) {
    return temp[0] as SiteDomain
  } else {
    return undefined
  }
})
// 站点域名搜索按钮的开关
const siteDomainSearchButtonDisabled = computed(() => !reversed.value && IsNullish(siteSelected.value))
// 站点弹窗的模式
const siteDomainDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 站点对话框开关
const siteDomainDialogState: Ref<boolean> = ref(false)
// 站点对话框的数据
const siteDomainDialogData: Ref<UnwrapRef<SiteDomainDTO>> = ref(new SiteDomainDTO())
// 站点域名侧边栏的查询参数
const siteDomainDrawerSearchParams: Ref<SiteDomainQueryDTO> = ref(new SiteDomainQueryDTO())
// 站点域名侧边数据表操作栏按钮
const siteDomainDrawerOperationButton: OperationItem<SiteDomainDTO>[] = [
  {
    label: '保存',
    icon: 'Checked',
    buttonType: 'primary',
    code: 'save',
    rule: (row) => siteDomainChangedRows.value.includes(row)
  },
  { label: '绑定', icon: 'Paperclip', code: 'bind' },
  { label: '查看', icon: 'view', code: DialogMode.VIEW },
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
  { label: '删除', icon: 'delete', code: 'delete' }
]

// 方法
// 分页查询站点
async function siteQueryPage(page: Page<SiteQueryDTO, Site>): Promise<Page<SiteQueryDTO, Site> | undefined> {
  if (IsNullish(page.query)) {
    page.query = new SiteQueryDTO()
  }
  if (reversed.value) {
    page.query.id = siteDomainSelected.value?.siteId
  }
  const response = await apis.siteQueryPage(page)
  if (ApiUtil.check(response)) {
    return ApiUtil.data<Page<SiteQueryDTO, Site>>(response)
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 分页查询站点（侧边栏用）
async function siteDrawerQueryPage(page: Page<SiteQueryDTO, Site>): Promise<Page<SiteQueryDTO, Site> | undefined> {
  const response = await apis.siteQueryPage(page)
  if (ApiUtil.check(response)) {
    return ApiUtil.data<Page<SiteQueryDTO, Site>>(response)
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 处理站点新增按钮点击事件
async function handleSiteCreateButtonClicked() {
  siteDialogMode.value = DialogMode.NEW
  siteDialogData.value = new Site()
  siteDialogState.value = true
}
// 处理站点数据行按钮点击事件
function handleSiteRowButtonClicked(op: DataTableOperationResponse<Site>) {
  switch (op.code) {
    case 'save':
      saveSiteRowEdit(op.data)
      break
    case 'openSiteDomainDrawer':
      drawerState.value = true
      siteSearchTable.value.toggleRowSelection(op.data, true)
      break
    case 'bind':
      changeDomainBind(siteDomainSelected.value?.id as number, Number(op.id), true)
      break
    case 'unbind':
      changeDomainBind(siteDomainSelected.value?.id as number, Number(op.id), false)
      break
    case DialogMode.VIEW:
      siteDialogMode.value = DialogMode.VIEW
      siteDialogData.value = op.data
      siteDialogState.value = true
      break
    case DialogMode.EDIT:
      siteDialogMode.value = DialogMode.EDIT
      siteDialogData.value = op.data
      siteDialogState.value = true
      break
    case 'delete':
      deleteSite(op.id)
      break
    default:
      break
  }
}
// 处理被选中的站点改变的事件
async function handleSiteSelectionChange() {
  if (!reversed.value) {
    siteDomainSearchTable.value.doSearch()
  }
}
// 保存站点行数据编辑
async function saveSiteRowEdit(newData: Site) {
  const tempData = lodash.cloneDeep(newData)

  const response = await apis.siteUpdateById(tempData)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    const index = siteChangedRows.value.indexOf(newData)
    siteChangedRows.value.splice(index, 1)
  }
}
// 删除站点
async function deleteSite(id: string) {
  const response = await apis.siteDeleteById(id)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    await siteSearchTable.value.doSearch()
  }
}
// 处理站点弹窗请求成功事件
function handleSiteDialogRequestSuccess() {
  siteSearchTable.value.doSearch()
}
// 分页查询站点域名
async function siteDomainQueryPage(
  page: Page<SiteDomainQueryDTO, SiteDomainDTO>
): Promise<Page<SiteDomainQueryDTO, SiteDomainDTO> | undefined> {
  if (IsNullish(page.query)) {
    page.query = new SiteQueryDTO()
  }
  if (!reversed.value) {
    page.query.siteId = siteSelected.value?.id
  }
  const response = await apis.siteDomainQueryDTOPage(page)
  if (ApiUtil.check(response)) {
    return ApiUtil.data<Page<SiteDomainQueryDTO, SiteDomainDTO>>(response)
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 根据站点分页查询站点域名
async function siteDomainQueryPageBySite(
  page: Page<SiteDomainQueryDTO, SiteDomainDTO>
): Promise<Page<SiteDomainQueryDTO, SiteDomainDTO> | undefined> {
  if (IsNullish(page.query)) {
    page.query = new SiteQueryDTO()
  }
  page.query.siteId = siteSelected.value?.id
  page.query.boundOnSite = false
  const response = await apis.siteDomainQueryDTOPageBySite(page)
  if (ApiUtil.check(response)) {
    return ApiUtil.data<Page<SiteDomainQueryDTO, SiteDomainDTO>>(response)
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 处理站点域名弹窗请求成功事件
function handleSiteDomainDialogRequestSuccess() {
  siteDomainSearchTable.value.doSearch()
}
// 处理站点域名新增按钮点击事件
async function handleSiteDomainCreateButtonClicked() {
  siteDomainDialogMode.value = DialogMode.NEW
  siteDomainDialogData.value = new SiteDomainDTO()
  siteDomainDialogState.value = true
}
// 处理站点域名数据行按钮点击事件
function handleSiteDomainRowButtonClicked(op: DataTableOperationResponse<SiteDomainDTO>) {
  switch (op.code) {
    case 'save':
      saveSiteDomainRowEdit(op.data)
      break
    case 'bind':
      changeDomainBind(Number(op.id), siteSelected.value?.id as number, true)
      break
    case 'openSiteDrawer':
      drawerState.value = true
      siteDomainSearchTable.value.toggleRowSelection(op.data, true)
      break
    case 'unbind':
      changeDomainBind(Number(op.id), siteSelected.value?.id as number, false)
      break
    case DialogMode.VIEW:
      siteDomainDialogMode.value = DialogMode.VIEW
      siteDomainDialogData.value = op.data
      siteDomainDialogState.value = true
      break
    case DialogMode.EDIT:
      siteDomainDialogMode.value = DialogMode.EDIT
      siteDomainDialogData.value = op.data
      siteDomainDialogState.value = true
      break
    case 'delete':
      deleteSiteDomain(op.id)
      break
    default:
      break
  }
}
// 保存站点域名行数据编辑
async function saveSiteDomainRowEdit(newData: SiteDomainDTO) {
  const tempData = lodash.cloneDeep(newData)

  const response = await apis.siteDomainUpdateById(tempData)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    const index = siteDomainChangedRows.value.indexOf(newData)
    siteDomainChangedRows.value.splice(index, 1)
  }
}
// 删除站点域名
async function deleteSiteDomain(id: string) {
  const response = await apis.siteDomainDeleteById(id)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    await siteDomainSearchTable.value.doSearch()
  }
}
// 域名绑定到站点上
async function changeDomainBind(siteDomainId: number, siteId: number, bind: boolean) {
  const tempData = new SiteDomainDTO()
  tempData.id = siteDomainId
  if (bind) {
    tempData.siteId = siteId
  } else {
    tempData.siteId = null
  }

  const response = await apis.siteDomainUpdateById(tempData)
  siteDomainSearchTable.value.doSearch()
  if (reversed.value) {
    drawerState.value = false
  } else {
    if (NotNullish(siteDomainDrawerSearchTable.value)) {
      siteDomainDrawerSearchTable.value.doSearch()
    }
  }
  if (ApiUtil.check(response)) {
    ElMessage({
      message: `${bind ? '绑定' : '解绑'}成功`,
      type: 'success'
    })
  } else {
    ElMessage({
      message: `${bind ? '绑定' : '解绑'}失败，${response.message}`,
      type: 'error'
    })
  }
}
// 处理被选中的域名改变的事件
async function handleSiteDomainSelectionChange() {
  if (reversed.value) {
    siteSearchTable.value.doSearch()
  }
}
function handleReverse() {
  reversed.value = !reversed.value
  if (reversed.value) {
    siteDomainSearchTable.value.doSearch()
    siteSearchTable.value.clearData()
  } else {
    siteSearchTable.value.doSearch()
    siteDomainSearchTable.value.clearData()
  }
}
</script>
<template>
  <base-subpage>
    <template #default>
      <div :class="{ 'site-manage-title': true, 'site-manage-title-reverse': reversed }">
        <div class="site-manage-left-title">
          <el-button size="large" type="danger" icon="Link"> 站点 </el-button>
        </div>
        <el-tooltip>
          <template #default>
            <el-button size="large" icon="Switch" @click="handleReverse" />
          </template>
          <template #content>切换至 域名-站点 模式</template>
        </el-tooltip>
        <div class="site-manage-right-title">
          <el-button size="large" type="primary" icon="Magnet"> 域名 </el-button>
        </div>
      </div>
      <div :class="{ 'site-manage-container': true, 'site-manage-container-reverse': reversed }">
        <div :class="{ 'site-manage-left': true, 'site-manage-left-reverse': reversed }">
          <search-table
            ref="siteSearchTable"
            v-model:page="sitePage"
            v-model:toolbar-params="siteSearchParams"
            v-model:changed-rows="siteChangedRows"
            class="site-manage-left-search-table"
            data-key="id"
            :operation-button="siteOperationButton"
            :operation-width="140"
            :thead="siteThead"
            :search="siteQueryPage"
            :selectable="true"
            :multi-select="reversed"
            :page-sizes="[10, 20, 50, 100]"
            :search-button-disabled="siteSearchButtonDisabled"
            @row-button-clicked="handleSiteRowButtonClicked"
            @selection-change="handleSiteSelectionChange"
          >
            <template #toolbarMain>
              <el-button type="primary" @click="handleSiteCreateButtonClicked">新增</el-button>
              <el-input v-model="siteSearchParams.siteName" placeholder="输入站点名称" clearable />
            </template>
          </search-table>
        </div>
        <div :class="{ 'site-manage-right': true, 'site-manage-right-reverse': reversed }">
          <search-table
            ref="siteDomainSearchTable"
            v-model:page="siteDomainPage"
            v-model:toolbar-params="siteDomainSearchParams"
            v-model:changed-rows="siteDomainChangedRows"
            class="site-manage-right-search-table"
            data-key="id"
            :operation-button="siteDomainOperationButton"
            :thead="siteDomainThead"
            :search="siteDomainQueryPage"
            :multi-select="!reversed"
            :selectable="true"
            :page-sizes="[10, 20, 50, 100, 1000]"
            :search-button-disabled="siteDomainSearchButtonDisabled"
            @row-button-clicked="handleSiteDomainRowButtonClicked"
            @selection-change="handleSiteDomainSelectionChange"
          >
            <template #toolbarMain>
              <el-button type="primary" @click="handleSiteDomainCreateButtonClicked">新增</el-button>
              <el-input v-model="siteDomainSearchParams.domain" placeholder="输入站点域名" clearable />
            </template>
          </search-table>
        </div>
        <el-drawer
          v-model="drawerState"
          :open-delay="1"
          size="45%"
          :with-header="false"
          @open="reversed ? siteDrawerSearchTable.doSearch() : siteDomainDrawerSearchTable.doSearch()"
        >
          <search-table
            v-if="!reversed"
            ref="siteDomainDrawerSearchTable"
            v-model:page="siteDomainPage"
            v-model:toolbar-params="siteDomainDrawerSearchParams"
            class="site-manage-left-search-table"
            data-key="id"
            :operation-button="siteDomainDrawerOperationButton"
            :thead="siteDomainThead"
            :search="siteDomainQueryPageBySite"
            :multi-select="false"
            :selectable="false"
            :page-sizes="[10, 20, 50, 100, 1000]"
            @row-button-clicked="handleSiteDomainRowButtonClicked"
          >
            <template #toolbarMain>
              <el-input v-model="siteDomainDrawerSearchParams.domain" placeholder="输入站点域名" clearable />
            </template>
          </search-table>
          <search-table
            v-if="reversed"
            ref="siteDrawerSearchTable"
            v-model:page="siteDrawerPage"
            v-model:toolbar-params="siteDrawerSearchParams"
            class="site-manage-left-search-table"
            data-key="id"
            :operation-button="siteDrawerOperationButton"
            :operation-width="140"
            :thead="siteThead"
            :search="siteDrawerQueryPage"
            :multi-select="false"
            :selectable="false"
            :page-sizes="[10, 20, 50, 100]"
            @row-button-clicked="handleSiteRowButtonClicked"
          >
            <template #toolbarMain>
              <el-button type="primary" @click="handleSiteCreateButtonClicked">新增</el-button>
              <el-input v-model="siteSearchParams.siteName" placeholder="输入站点名称" clearable />
            </template>
          </search-table>
        </el-drawer>
      </div>
    </template>
    <template #dialog>
      <site-dialog
        v-model:form-data="siteDialogData"
        v-model:state="siteDialogState"
        :mode="siteDialogMode"
        @request-success="handleSiteDialogRequestSuccess"
      />
      <site-domain-dialog
        v-model:form-data="siteDomainDialogData"
        v-model:state="siteDomainDialogState"
        :mode="siteDomainDialogMode"
        @request-success="handleSiteDomainDialogRequestSuccess"
      />
    </template>
  </base-subpage>
</template>

<style scoped>
.site-manage-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 5px;
}
.site-manage-title-reverse {
  flex-direction: row-reverse;
}
.site-manage-left-title {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
  width: 100%;
}
.site-manage-right-title {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
  width: 100%;
}
.site-manage-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  background: #f4f4f4;
  border-radius: 6px;
  width: calc(100% - 20px);
  height: calc(100% - 20px - 45px);
  padding: 5px;
  margin: 5px;
}

.site-manage-container-reverse {
  flex-direction: row-reverse;
}

.site-manage-left {
  width: calc(50% - 5px);
  height: 100%;
  margin-right: 5px;
}
.site-manage-left-reverse {
  margin-left: 5px;
}
.site-manage-left-search-table {
  height: 100%;
  width: 100%;
}
.site-manage-right {
  width: calc(50% - 5px);
  height: 100%;
  margin-left: 5px;
}
.site-manage-right-reverse {
  margin-right: 5px;
}
.site-manage-right-search-table {
  height: 100%;
  width: 100%;
}
</style>
