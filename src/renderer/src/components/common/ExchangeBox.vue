<script setup lang="ts" generic="Query extends object">
import SearchToolbarV1 from '@renderer/components/common/SearchToolbarV1.vue'
import { Ref, ref, UnwrapRef } from 'vue'
import SelectItem from '../../model/util/SelectItem'
import TagBox from './TagBox.vue'
import { ArrayNotEmpty, IsNullish, NotNullish } from '../../utils/CommonUtil'
import Page from '@renderer/model/util/Page.ts'
import IPage from '@renderer/model/util/IPage.ts'
import CollapsePanel from '@renderer/components/common/CollapsePanel.vue'
import { Check, Close } from '@element-plus/icons-vue'

// props
const props = defineProps<{
  upperLoad: (page: IPage<Query, SelectItem>) => Promise<IPage<Query, SelectItem>> // upper的加载函数
  lowerLoad: (page: IPage<Query, SelectItem>) => Promise<IPage<Query, SelectItem>> // lower的加载函数
  searchButtonDisabled: boolean
  tagsGap?: string
}>()

// model
const upperSearchParams = defineModel<object>('upperSearchParams', { required: false, default: {} }) // upper搜索栏参数
const lowerSearchParams = defineModel<object>('lowerSearchParams', { required: false, default: {} }) // lower搜索栏参数

// 事件
const emits = defineEmits(['upperConfirm', 'lowerConfirm', 'allConfirm'])

// 暴露
defineExpose({
  refreshData
})

// 变量
const upperPage = new Page<Query, SelectItem>() // upper的分页
const upperData: Ref<UnwrapRef<SelectItem[]>> = ref([]) // upper的数据
const lowerPage = new Page<Query, SelectItem>() // lower的分页
const lowerData: Ref<UnwrapRef<SelectItem[]>> = ref([]) // lower的数据
const upperTagBox = ref() // upperTagBox组件的实例
const lowerTagBox = ref() // lowerTagBox组件的实例
const upperBufferState: Ref<boolean> = ref(false) // upperBuffer的折叠面板开关
const upperBufferData: Ref<UnwrapRef<SelectItem[]>> = ref([]) // upperBuffer的数据
const upperBufferId: Ref<UnwrapRef<Set<number | string>>> = ref(new Set<string>()) // upperBuffer的数据Id
const lowerBufferState: Ref<boolean> = ref(false) // lowerBuffer的折叠面板开关
const lowerBufferData: Ref<UnwrapRef<SelectItem[]>> = ref([]) // lowerBuffer的数据
const lowerBufferId: Ref<UnwrapRef<Set<number | string>>> = ref(new Set<string>()) // lowerBuffer的数据Id

// 方法
// 处理搜索按钮点击事件
async function doSearch(isUpper: boolean) {
  // 点击搜索按钮后，分页和滚动条位置重置，已经存在于buffer中的数据从分页数据中清除
  resetScrollBarPosition(isUpper)
  if (isUpper) {
    await upperTagBox.value.newSearch()
    if (NotNullish(upperData.value)) {
      upperData.value = leachBufferData(upperData.value, isUpper)
    }
  } else {
    await lowerTagBox.value.newSearch()
    if (NotNullish(lowerData.value)) {
      lowerData.value = leachBufferData(lowerData.value, isUpper)
    }
  }
}
// 处理check-tag点击事件
function handleCheckTagClick(tag: SelectItem, type: 'upperData' | 'upperBuffer' | 'lowerData' | 'lowerBuffer') {
  switch (type) {
    case 'upperData':
      exchange(upperData.value, lowerBufferData.value, tag)
      lowerBufferId.value.add(tag.value)
      break
    case 'upperBuffer':
      exchange(upperBufferData.value, lowerData.value, tag)
      if (upperBufferId.value.has(tag.value)) {
        upperBufferId.value.delete(tag.value)
      }
      break
    case 'lowerData':
      exchange(lowerData.value, upperBufferData.value, tag)
      upperBufferId.value.add(tag.value)
      break
    case 'lowerBuffer':
      exchange(lowerBufferData.value, upperData.value, tag)
      if (lowerBufferId.value.has(tag.value)) {
        lowerBufferId.value.delete(tag.value)
      }
      break
    default:
      break
  }
  handleBufferToggle()
}
// 元素由source移动至target
function exchange(source: SelectItem[], target: SelectItem[], item: SelectItem) {
  const index = source.indexOf(item)
  if (index !== -1) {
    source.splice(index, 1)
  }
  target.push(item)
}
// 处理确认交换事件
function handleExchangeConfirm(isUpper?: boolean) {
  if (IsNullish(isUpper) ? true : isUpper) {
    emits('upperConfirm', upperBufferData.value, lowerBufferData.value)
  }
  if (IsNullish(isUpper) ? true : !isUpper) {
    emits('lowerConfirm', upperBufferData.value, lowerBufferData.value)
  }
}
// 处理清空按钮点击
function handleClearButtonClicked(isUpper?: boolean) {
  if (IsNullish(isUpper) ? true : isUpper) {
    lowerData.value.push(...upperBufferData.value)
    upperBufferData.value = []
    upperBufferId.value.clear()
  }
  if (IsNullish(isUpper) ? true : !isUpper) {
    upperData.value.push(...lowerBufferData.value)
    lowerBufferData.value = []
    lowerBufferId.value.clear()
  }
  handleBufferToggle()
  // refreshData()
}
// 刷新内容
function refreshData(isUpper: boolean | undefined) {
  if (IsNullish(isUpper) ? true : isUpper) {
    upperBufferData.value = []
    upperBufferId.value.clear()
    upperTagBox.value.newSearch()
  }
  if (IsNullish(isUpper) ? true : !isUpper) {
    lowerBufferData.value = []
    lowerBufferId.value.clear()
    lowerTagBox.value.newSearch()
  }
  resetScrollBarPosition(isUpper)
  handleBufferToggle()
}
// 请求DataScroll下一页数据
async function requestNextPage(page: IPage<Query, SelectItem>, isUpper: boolean): Promise<IPage<Query, SelectItem>> {
  // 请求接口
  let newPagePromise: Promise<IPage<Query, SelectItem>>
  if (isUpper) {
    page.query = upperSearchParams.value as Query
    newPagePromise = props.upperLoad(page)
  } else {
    page.query = lowerSearchParams.value as Query
    newPagePromise = props.lowerLoad(page)
  }

  return newPagePromise.then((newPage) => {
    if (ArrayNotEmpty(newPage.data)) {
      newPage.data = leachBufferData(newPage.data, isUpper)
    }
    return newPage
  })
}
// 滚动条位置重置(移动至顶端)
function resetScrollBarPosition(isUpper?: boolean) {
  if (isUpper === undefined) {
    upperTagBox.value.scrollbar.setScrollTop(0)
    lowerTagBox.value.scrollbar.setScrollTop(0)
  } else if (isUpper) {
    upperTagBox.value.scrollbar.setScrollTop(0)
  } else {
    lowerTagBox.value.scrollbar.setScrollTop(0)
  }
}
// 过滤存在于Buffer中的
function leachBufferData(increment: SelectItem[], isUpper: boolean) {
  if (isUpper) {
    // 过滤掉upperBufferId已包含的数据
    return increment.filter((item: SelectItem) => {
      return !lowerBufferId.value.has(item.value)
    })
  } else {
    // 过滤掉lowerBufferId已包含的数据
    return increment.filter((item: SelectItem) => {
      return !upperBufferId.value.has(item.value)
    })
  }
}
// 处理buffer是否折叠
function handleBufferToggle() {
  upperBufferState.value = ArrayNotEmpty(upperBufferData.value)
  lowerBufferState.value = ArrayNotEmpty(lowerBufferData.value)
}
</script>

<template>
  <div class="exchange-box">
    <div class="exchange-box-title">
      <div class="exchange-box-upper-title">
        <slot name="upperTitle" />
      </div>
      <div class="exchange-box-all-op">
        <el-tooltip placement="right" :enterable="false">
          <template #default>
            <div class="exchange-box-all-confirm" @click="handleExchangeConfirm()">
              <el-icon class="exchange-box-all-confirm-icon"><Check /></el-icon>
            </div>
          </template>
          <template #content>全部确认</template>
        </el-tooltip>
        <el-tooltip placement="right" :enterable="false">
          <template #default>
            <div class="exchange-box-all-clear" @click="handleClearButtonClicked()">
              <el-icon class="exchange-box-all-clear-icon"><Close /></el-icon>
            </div>
          </template>
          <template #content>全部清空</template>
        </el-tooltip>
      </div>
      <div class="exchange-box-lower-title">
        <slot name="lowerTitle" />
      </div>
    </div>
    <div class="exchange-box-main">
      <div class="exchange-box-upper-container">
        <div class="exchange-box-upper-toolbar z-layer-1">
          <search-toolbar-v1 :search-button-disabled="searchButtonDisabled" @search-button-clicked="doSearch(true)">
            <template #main>
              <slot name="upperToolbarMain" />
            </template>
            <template #dropdown>
              <slot name="upperToolbarDropdown" />
            </template>
          </search-toolbar-v1>
        </div>
        <div class="exchange-box-upper-main">
          <tag-box
            ref="upperTagBox"
            v-model:page="upperPage"
            v-model:data="upperData"
            class="exchange-box-upper-tag-box"
            :load="(_page: IPage<Query, SelectItem>) => requestNextPage(_page, true)"
            :tags-gap="tagsGap"
            @tag-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'upperData')"
          />
          <collapse-panel
            class="exchange-box-upper-op-button-group"
            :state="upperBufferState"
            :toggle-on-outside-click="false"
            hide-handle
            max-length="200px"
            position="left"
            border-radios="10px"
          >
            <div class="exchange-box-upper-op-button-upper" @click="handleExchangeConfirm(true)">
              <el-icon class="exchange-box-upper-op-button-upper-icon"><Check /></el-icon>
            </div>
            <div class="exchange-box-upper-op-button-lower" @click="handleClearButtonClicked(true)">
              <el-icon class="exchange-box-upper-op-button-lower-icon"><Close /></el-icon>
            </div>
          </collapse-panel>
          <collapse-panel
            class="exchange-box-middle-buffer-upper-panel"
            :state="upperBufferState"
            :toggle-on-outside-click="false"
            max-length="200px"
            position="right"
          >
            <tag-box
              v-model:data="upperBufferData"
              class="exchange-box-middle-buffer-upper"
              @tag-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'upperBuffer')"
            />
          </collapse-panel>
        </div>
      </div>
      <div class="exchange-box-lower-container">
        <div class="exchange-box-lower-main">
          <tag-box
            ref="lowerTagBox"
            v-model:page="lowerPage"
            v-model:data="lowerData"
            class="exchange-box-lower-tag-box"
            :load="(_page: IPage<Query, SelectItem>) => requestNextPage(_page, false)"
            :tags-gap="tagsGap"
            @tag-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'lowerData')"
          />
          <collapse-panel
            class="exchange-box-lower-op-button-group"
            :state="lowerBufferState"
            :toggle-on-outside-click="false"
            hide-handle
            max-length="200px"
            position="left"
            border-radios="10px"
          >
            <div class="exchange-box-lower-op-button-upper" @click="handleExchangeConfirm(false)">
              <el-icon class="exchange-box-lower-op-button-upper-icon"><Check /></el-icon>
            </div>
            <div class="exchange-box-lower-op-button-lower" @click="handleClearButtonClicked(false)">
              <el-icon class="exchange-box-lower-op-button-lower-icon"><Close /></el-icon>
            </div>
          </collapse-panel>
          <collapse-panel
            class="exchange-box-middle-buffer-lower-panel"
            :state="lowerBufferState"
            :toggle-on-outside-click="false"
            max-length="200px"
            position="right"
          >
            <tag-box
              v-model:data="lowerBufferData"
              class="exchange-box-middle-buffer-lower"
              @tag-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'lowerBuffer')"
            />
          </collapse-panel>
        </div>
        <div class="exchange-box-lower-toolbar z-layer-1">
          <search-toolbar-v1 :reverse="true" :search-button-disabled="searchButtonDisabled" @search-button-clicked="doSearch(false)">
            <template #main>
              <slot name="lowerToolbarMain" />
            </template>
            <template #dropdown>
              <slot name="lowerToolbarDropdown" />
            </template>
          </search-toolbar-v1>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exchange-box {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
}
.exchange-box-title {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 40px;
}
.exchange-box-main {
  display: flex;
  flex-direction: column;
  width: calc(100% - 40px);
}
.exchange-box-upper-title {
  display: flex;
  flex-grow: 1;
  width: 100%;
}
.exchange-box-lower-title {
  display: flex;
  flex-grow: 1;
  width: 100%;
}
.exchange-box-all-op {
  width: 100%;
  height: 80px;
}
.exchange-box-all-confirm {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50%;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-8);
  box-sizing: border-box;
  border: 1px solid var(--el-color-primary-light-5);
  border-bottom: none;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  cursor: pointer;
  transition: 0.3s;
}
.exchange-box-all-confirm:hover {
  background-color: var(--el-color-primary-light-9);
}
.exchange-box-all-confirm-icon {
  transition: 0.3s;
}
.exchange-box-all-confirm:hover .exchange-box-all-confirm-icon {
  scale: 1.5;
}
.exchange-box-all-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50%;
  color: var(--el-color-danger);
  background-color: var(--el-color-danger-light-8);
  box-sizing: border-box;
  border: 1px solid var(--el-color-danger-light-5);
  border-top: none;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  cursor: pointer;
  transition: 0.3s;
}
.exchange-box-all-clear-icon {
  transition: 0.3s;
}
.exchange-box-all-clear:hover .exchange-box-all-clear-icon {
  scale: 1.5;
}
.exchange-box-all-clear:hover {
  background-color: var(--el-color-danger-light-9);
}
.exchange-box-upper-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 50%;
  border-bottom: dotted 1px var(--el-border-color-darker);
}
.exchange-box-upper-main {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: calc(100% - 32px);
}
.exchange-box-upper-toolbar {
  width: 100%;
  height: 32px;
  background-color: var(--el-fill-color-blank);
  border-top-left-radius: 4px;
}
.exchange-box-upper-tag-box {
  order: 2;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
}
.exchange-box-upper-op-button-group {
  height: 100px;
  margin: auto;
  order: 1;
}
.exchange-box-upper-op-button-upper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50%;
  width: 20px;
  transition: 0.5s;
  cursor: pointer;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-8);
}
.exchange-box-upper-op-button-upper:hover {
  background-color: var(--el-color-primary-light-9);
}
.exchange-box-upper-op-button-upper-icon {
  transition: 0.3s;
}
.exchange-box-upper-op-button-upper:hover .exchange-box-upper-op-button-upper-icon {
  scale: 1.2;
}
.exchange-box-upper-op-button-lower {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50%;
  width: 20px;
  transition: 0.5s;
  cursor: pointer;
  color: var(--el-color-danger);
  background-color: var(--el-color-danger-light-8);
}
.exchange-box-upper-op-button-lower:hover {
  background-color: var(--el-color-danger-light-9);
}
.exchange-box-upper-op-button-lower-icon {
  transition: 0.3s;
}
.exchange-box-upper-op-button-lower:hover .exchange-box-upper-op-button-lower-icon {
  scale: 1.2;
}
.exchange-box-middle-buffer-upper-panel {
  order: 3;
}
.exchange-box-middle-buffer-upper {
  height: 100%;
  background-color: #ffffff;
  box-sizing: border-box;
}
.exchange-box-middle-buffer-lower-panel {
  order: 3;
}
.exchange-box-middle-buffer-lower {
  height: 100%;
  background-color: #fbfbfb;
  box-sizing: border-box;
}
.exchange-box-lower-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 50%;
  border-top: dotted 1px var(--el-border-color-darker);
}
.exchange-box-lower-main {
  display: flex;
  width: 100%;
  height: calc(100% - 32px);
}
.exchange-box-lower-toolbar {
  width: 100%;
  height: 32px;
  background-color: var(--el-fill-color-blank);
  border-bottom-left-radius: 4px;
}
.exchange-box-lower-tag-box {
  order: 2;
  width: 100%;
  height: 100%;
  background-color: #fbfbfb;
}
.exchange-box-lower-op-button-group {
  height: 100px;
  margin: auto;
  order: 1;
}
.exchange-box-lower-op-button-upper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50%;
  width: 20px;
  transition: 0.5s;
  cursor: pointer;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-8);
}
.exchange-box-lower-op-button-upper:hover {
  background-color: var(--el-color-primary-light-9);
}
.exchange-box-lower-op-button-upper-icon {
  transition: 0.3s;
}
.exchange-box-lower-op-button-upper:hover .exchange-box-lower-op-button-upper-icon {
  scale: 1.2;
}
.exchange-box-lower-op-button-lower {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50%;
  width: 20px;
  transition: 0.5s;
  cursor: pointer;
  color: var(--el-color-danger);
  background-color: var(--el-color-danger-light-8);
}
.exchange-box-lower-op-button-lower:hover {
  background-color: var(--el-color-danger-light-9);
}
.exchange-box-lower-op-button-lower-icon {
  transition: 0.3s;
}
.exchange-box-lower-op-button-lower:hover .exchange-box-lower-op-button-lower-icon {
  scale: 1.2;
}
</style>
