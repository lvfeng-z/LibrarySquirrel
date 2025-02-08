<script setup lang="ts" generic="Query extends object">
import SearchToolbar from './SearchToolbar.vue'
import { InputBox } from '../../model/util/InputBox'
import { Ref, ref, UnwrapRef } from 'vue'
import SelectItem from '../../model/util/SelectItem'
import TagBox from './TagBox.vue'
import { ArrayNotEmpty, NotNullish } from '../../utils/CommonUtil'
import Page from '@renderer/model/util/Page.ts'
import IPage from '@renderer/model/util/IPage.ts'
import CollapsePanel from '@renderer/components/common/CollapsePanel.vue'

// props
const props = defineProps<{
  upperTitle: string // upper的标题
  lowerTitle: string // lower的标题
  upperMainInputBoxes?: InputBox[] // upper的SearchToolbar的主菜单参数
  upperDropDownInputBoxes?: InputBox[] // upper的SearchToolbar的下拉菜单参数
  lowerMainInputBoxes?: InputBox[] // lower的SearchToolbar的主菜单参数
  lowerDropDownInputBoxes?: InputBox[] // lower的SearchToolbar的下拉菜单参数
  upperLoad: (page: IPage<Query, SelectItem>) => Promise<IPage<Query, SelectItem>> // upper的加载函数
  lowerLoad: (page: IPage<Query, SelectItem>) => Promise<IPage<Query, SelectItem>> // lower的加载函数
  searchButtonDisabled: boolean
}>()

// 事件
const emits = defineEmits(['exchangeConfirm'])

// 暴露
defineExpose({
  refreshData
})

// 变量
const upperSearchToolbarParams = ref({}) // upper搜索栏参数
const lowerSearchToolbarParams = ref({}) // lower搜索栏参数
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
async function doSearch(upperOrLower: boolean) {
  // 点击搜索按钮后，分页和滚动条位置重置，已经存在于buffer中的数据从分页数据中清除
  resetScrollBarPosition(upperOrLower)
  if (upperOrLower) {
    await upperTagBox.value.newSearch()
    if (NotNullish(upperData.value)) {
      upperData.value = leachBufferData(upperData.value, upperOrLower)
    }
  } else {
    await lowerTagBox.value.newSearch()
    if (NotNullish(lowerData.value)) {
      lowerData.value = leachBufferData(lowerData.value, upperOrLower)
    }
  }
}
// 处理check-tag点击事件
function handleCheckTagClick(tag: SelectItem, type: 'upperData' | 'upperBuffer' | 'lowerData' | 'lowerBuffer') {
  switch (type) {
    case 'upperData':
      exchange(upperData.value, lowerBufferData.value, tag)
      upperBufferId.value.add(tag.value)
      break
    case 'upperBuffer':
      exchange(upperBufferData.value, lowerData.value, tag)
      if (upperBufferId.value.has(tag.value)) {
        upperBufferId.value.delete(tag.value)
      }
      break
    case 'lowerData':
      exchange(lowerData.value, upperBufferData.value, tag)
      lowerBufferId.value.add(tag.value)
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
function handleExchangeConfirm() {
  emits('exchangeConfirm', upperBufferData.value, lowerBufferData.value)
}
// 处理清空按钮点击
function handleClearButtonClicked() {
  upperData.value.push(...lowerBufferData.value)
  upperBufferData.value = []
  upperBufferId.value.clear()
  lowerData.value.push(...upperBufferData.value)
  lowerBufferData.value = []
  lowerBufferId.value.clear()
}
// 刷新内容
function refreshData() {
  upperBufferData.value = []
  upperBufferId.value.clear()
  lowerBufferData.value = []
  lowerBufferId.value.clear()
  resetScrollBarPosition()
  upperTagBox.value.newSearch()
  lowerTagBox.value.newSearch()
}
// 请求DataScroll下一页数据
async function requestNextPage(page: IPage<Query, SelectItem>, upperOrLower: boolean): Promise<IPage<Query, SelectItem>> {
  // 请求接口
  let newPagePromise: Promise<IPage<Query, SelectItem>>
  if (upperOrLower) {
    page.query = upperSearchToolbarParams.value as Query
    newPagePromise = props.upperLoad(page)
  } else {
    page.query = lowerSearchToolbarParams.value as Query
    newPagePromise = props.lowerLoad(page)
  }

  return newPagePromise.then((newPage) => {
    if (ArrayNotEmpty(newPage.data)) {
      newPage.data = leachBufferData(newPage.data, upperOrLower)
    }
    return newPage
  })
}
// 滚动条位置重置(移动至顶端)
function resetScrollBarPosition(upperOrLower?: boolean) {
  if (upperOrLower === undefined) {
    upperTagBox.value.scrollbar.setScrollTop(0)
    lowerTagBox.value.scrollbar.setScrollTop(0)
  } else if (upperOrLower) {
    upperTagBox.value.scrollbar.setScrollTop(0)
  } else {
    lowerTagBox.value.scrollbar.setScrollTop(0)
  }
}
// 过滤存在于Buffer中的
function leachBufferData(increment: SelectItem[], upperOrLower: boolean) {
  if (upperOrLower) {
    // 过滤掉upperBufferId已包含的数据
    return increment.filter((item: SelectItem) => {
      return !upperBufferId.value.has(item.value)
    })
  } else {
    // 过滤掉lowerBufferId已包含的数据
    return increment.filter((item: SelectItem) => {
      return !lowerBufferId.value.has(item.value)
    })
  }
}
</script>

<template>
  <div class="exchange-box">
    <div class="exchange-box-upper">
      <div class="exchange-box-upper-name">
        <el-check-tag :checked="true" class="exchange-box-middle-confirm-button" type="primary" @click="handleExchangeConfirm">
          {{ upperTitle }}
        </el-check-tag>
      </div>
      <div class="exchange-box-upper-main">
        <div class="exchange-box-upper-toolbar z-layer-1">
          <search-toolbar
            :create-button="false"
            :drop-down-input-boxes="upperDropDownInputBoxes"
            :main-input-boxes="upperMainInputBoxes"
            :search-button-disabled="searchButtonDisabled"
            :params="upperSearchToolbarParams"
            @search-button-clicked="doSearch(true)"
          >
          </search-toolbar>
        </div>
        <div style="display: flex; flex-direction: row; width: 100%; height: 100%">
          <tag-box
            ref="upperTagBox"
            v-model:page="upperPage"
            v-model:data="upperData"
            class="exchange-box-upper-tag-box"
            :load="(_page: IPage<Query, SelectItem>) => requestNextPage(_page, true)"
            @tag-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'upperData')"
          />
          <collapse-panel :state="upperBufferState" position="right">
            <tag-box
              v-model:data="upperBufferData"
              class="exchange-box-middle-buffer-upper"
              @tag-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'upperBuffer')"
            />
          </collapse-panel>
        </div>
      </div>
    </div>
    <div class="exchange-box-lower">
      <div class="exchange-box-lower-name">
        <el-check-tag :checked="false" class="exchange-box-middle-clear-button" type="info" @click="handleClearButtonClicked">
          {{ lowerTitle }}
        </el-check-tag>
      </div>
      <div class="exchange-box-lower-main">
        <div style="display: flex; flex-direction: row-reverse; width: 100%; height: 100%">
          <tag-box
            ref="lowerTagBox"
            v-model:page="lowerPage"
            v-model:data="lowerData"
            class="exchange-box-lower-tag-box"
            :load="(_page: IPage<Query, SelectItem>) => requestNextPage(_page, false)"
            @tag-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'lowerData')"
          />
          <collapse-panel :state="lowerBufferState" position="left">
            <tag-box
              v-model:data="lowerBufferData"
              class="exchange-box-middle-buffer-lower"
              @tag-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'lowerBuffer')"
            />
          </collapse-panel>
        </div>
        <div class="exchange-box-lower-toolbar z-layer-1">
          <search-toolbar
            :create-button="false"
            :drop-down-input-boxes="lowerDropDownInputBoxes"
            :main-input-boxes="lowerMainInputBoxes"
            :reverse="true"
            :search-button-disabled="searchButtonDisabled"
            :params="lowerSearchToolbarParams"
            @search-button-clicked="doSearch(false)"
          >
          </search-toolbar>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exchange-box {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}
.exchange-box-upper {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 50%;
}
.exchange-box-upper-name {
  display: flex;
  justify-content: center;
  width: 64px;
  height: 100%;
  writing-mode: vertical-lr;
  background-color: #fbfbfb;
  border-top-left-radius: 6px;
}
.exchange-box-upper-main {
  display: flex;
  flex-direction: column;
  width: calc(100% - 64px);
  height: 100%;
}
.exchange-box-upper-toolbar {
  width: 100%;
  height: 32px;
}
.exchange-box-upper-tag-box {
  width: 100%;
  height: 100%;
  background-color: #ffffff;
}
.exchange-box-middle-confirm-button {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}
.exchange-box-middle-clear-button {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}
.exchange-box-middle-buffer-upper {
  height: 100%;
  background-color: #ffffff;
  box-sizing: border-box;
}
.exchange-box-middle-buffer-lower {
  height: 100%;
  background-color: #fbfbfb;
  box-sizing: border-box;
}
.exchange-box-lower {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 50%;
}
.exchange-box-lower-name {
  display: flex;
  justify-content: center;
  width: 64px;
  height: 100%;
  writing-mode: vertical-lr;
  background-color: #ffffff;
  border-bottom-left-radius: 6px;
}
.exchange-box-lower-main {
  display: flex;
  flex-direction: column;
  width: calc(100% - 64px);
  height: 100%;
}
.exchange-box-lower-toolbar {
  width: 100%;
  height: 32px;
}
.exchange-box-lower-tag-box {
  width: 100%;
  height: 100%;
  background-color: #fbfbfb;
}
</style>
