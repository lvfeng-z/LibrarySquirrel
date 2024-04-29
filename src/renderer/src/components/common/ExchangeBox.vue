<script setup lang="ts">
import SearchToolbar from './SearchToolbar.vue'
import { SearchBox } from '../../utils/model/SearchBox'
import { Ref, ref, UnwrapRef } from 'vue'
import { SelectOption } from '../../utils/model/SelectOption'
import { apiResponseCheck, apiResponseGetData, apiResponseMsg } from '../../utils/function/ApiUtil'
import { ApiResponse } from '../../utils/model/ApiResponse'

// props
const props = defineProps<{
  upperTitle: string // upper的标题
  lowerTitle: string // lower的标题
  upperMainSearchBoxes: SearchBox[] // upper的SearchToolbar的主菜单参数
  upperDropDownSearchBoxes: SearchBox[] // upper的SearchToolbar的下拉菜单参数
  lowerMainSearchBoxes: SearchBox[] // lower的SearchToolbar的主菜单参数
  lowerDropDownSearchBoxes: SearchBox[] // lower的SearchToolbar的下拉菜单参数
  upperSearchApi: (args: object) => Promise<never> // upper的接口
  lowerSearchApi: (args: object) => Promise<never> // lower的接口
  upperApiStaticParams: object // upper的接口固定参数
  lowerApiStaticParams: object // lower的接口固定参数
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
const upperData: Ref<UnwrapRef<SelectOption[]>> = ref([]) // upper的数据
const lowerData: Ref<UnwrapRef<SelectOption[]>> = ref([]) // lower的数据
const upperBufferData: Ref<UnwrapRef<SelectOption[]>> = ref([]) // upperBuffer的数据
const upperBufferId: Ref<UnwrapRef<Set<string>>> = ref(new Set<string>()) // upperBuffer的数据Id
const lowerBufferData: Ref<UnwrapRef<SelectOption[]>> = ref([]) // lowerBuffer的数据
const lowerBufferId: Ref<UnwrapRef<Set<string>>> = ref(new Set<string>()) // lowerBuffer的数据Id

// 方法
// 处理SearchToolbar参数变化
function handleUpperSearchToolbarParamsChanged(params: object) {
  upperSearchToolbarParams.value = JSON.parse(JSON.stringify(params))
}
// 处理SearchToolbar参数变化
function handleLowerSearchToolbarParamsChanged(params: object) {
  lowerSearchToolbarParams.value = JSON.parse(JSON.stringify(params))
}
// 处理搜索按钮点击事件
async function handleSearchButtonClicked(upperOrLower: boolean) {
  const newData = await requestApiAndGetData(upperOrLower)

  if (newData) {
    if (upperOrLower) {
      // 过滤掉upperBufferId已包含的数据
      upperData.value = newData.filter((item: SelectOption) => {
        return !upperBufferId.value.has(item.value)
      })
    } else {
      // 过滤掉lowerBufferId已包含的数据
      lowerData.value = newData.filter((item: SelectOption) => {
        return !lowerBufferId.value.has(item.value)
      })
    }
  }
}
// 处理check-tag点击事件
function handleCheckTagClick(
  tag: SelectOption,
  type: 'upperData' | 'upperBuffer' | 'lowerData' | 'lowerBuffer'
) {
  switch (type) {
    case 'upperData':
      exchange(upperData.value, upperBufferData.value, tag)
      upperBufferId.value.add(tag.value)
      break
    case 'upperBuffer':
      exchange(upperBufferData.value, upperData.value, tag)
      if (upperBufferId.value.has(tag.value)) {
        upperBufferId.value.delete(tag.value)
      }
      break
    case 'lowerData':
      exchange(lowerData.value, lowerBufferData.value, tag)
      lowerBufferId.value.add(tag.value)
      break
    case 'lowerBuffer':
      exchange(lowerBufferData.value, lowerData.value, tag)
      if (lowerBufferId.value.has(tag.value)) {
        lowerBufferId.value.delete(tag.value)
      }
      break
    default:
      break
  }
}
// 元素由source移动至target
function exchange(source: SelectOption[], target: SelectOption[], item: SelectOption) {
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
  upperData.value.push(...upperBufferData.value)
  upperBufferData.value = []
  upperBufferId.value.clear()
  lowerData.value.push(...lowerBufferData.value)
  lowerBufferData.value = []
  lowerBufferId.value.clear()
}
// 刷新内容
function refreshData() {
  upperBufferData.value = []
  upperBufferId.value.clear()
  lowerBufferData.value = []
  lowerBufferId.value.clear()

  requestApiAndGetData(true).then((response) => {
    upperData.value = response == undefined ? [] : response
  })
  requestApiAndGetData(false).then((response) => {
    lowerData.value = response == undefined ? [] : response
  })
}
// 请求查询接口
async function requestApiAndGetData(upperOrLower: boolean): Promise<SelectOption[] | undefined> {
  let response: ApiResponse
  if (upperOrLower) {
    const params = { ...upperSearchToolbarParams.value, ...props.upperApiStaticParams }
    response = await props.upperSearchApi(params)
  } else {
    const params = { ...lowerSearchToolbarParams.value, ...props.lowerApiStaticParams }
    response = await props.lowerSearchApi(params)
  }

  let newData: SelectOption[]
  if (apiResponseCheck(response)) {
    newData = apiResponseGetData(response) as SelectOption[]
    return newData
  } else {
    apiResponseMsg(response)
    return undefined
  }
}
</script>

<template>
  <div class="exchange-box">
    <div class="exchange-box-upper">
      <div class="exchange-box-upper-name rounded-borders">
        <el-text>{{ upperTitle }}</el-text>
      </div>
      <div class="exchange-box-upper-main">
        <div class="exchange-box-upper-toolbar z-layer-1">
          <SearchToolbar
            :create-button="false"
            :drop-down-search-boxes="upperDropDownSearchBoxes"
            :main-search-boxes="upperMainSearchBoxes"
            @search-button-clicked="handleSearchButtonClicked(true)"
            @params-changed="handleUpperSearchToolbarParamsChanged"
          >
          </SearchToolbar>
        </div>
        <div class="exchange-box-upper-data rounded-borders margin-box">
          <el-scrollbar>
            <el-row>
              <template v-for="item in upperData" :key="item.value">
                <div class="exchange-box-upperLower-data-item">
                  <el-check-tag
                    :checked="true"
                    type="primary"
                    @change="handleCheckTagClick(item, 'upperData')"
                  >
                    {{ item.label }}
                  </el-check-tag>
                </div>
              </template>
            </el-row>
          </el-scrollbar>
        </div>
      </div>
    </div>
    <div class="exchange-box-middle">
      <div class="exchange-box-middle-operation">
        <div class="exchange-box-middle-confirm">
          <el-check-tag
            :checked="true"
            class="exchange-box-middle-confirm-button"
            type="primary"
            @click="handleExchangeConfirm"
            >确认
          </el-check-tag>
        </div>
        <div class="exchange-box-middle-clear">
          <el-check-tag
            :checked="false"
            class="exchange-box-middle-clear-button"
            type="info"
            @click="handleClearButtonClicked"
            >清空</el-check-tag
          >
        </div>
      </div>
      <div class="exchange-box-middle-buffer">
        <div class="exchange-box-middle-buffer-upper rounded-borders">
          <el-scrollbar>
            <el-row>
              <template v-for="item in upperBufferData" :key="item.id">
                <div class="exchange-box-upperLower-data-item">
                  <el-check-tag
                    :checked="true"
                    type="warning"
                    @change="handleCheckTagClick(item, 'upperBuffer')"
                  >
                    {{ item.label }}
                  </el-check-tag>
                </div>
              </template>
            </el-row>
          </el-scrollbar>
        </div>
        <div class="exchange-box-middle-buffer-lower rounded-borders">
          <el-scrollbar>
            <el-row>
              <template v-for="item in lowerBufferData" :key="item.id">
                <div class="exchange-box-upperLower-data-item">
                  <el-check-tag
                    :checked="true"
                    type="warning"
                    @change="handleCheckTagClick(item, 'lowerBuffer')"
                  >
                    {{ item.label }}
                  </el-check-tag>
                </div>
              </template>
            </el-row>
          </el-scrollbar>
        </div>
      </div>
    </div>
    <div class="exchange-box-lower">
      <div class="exchange-box-lower-name rounded-borders">
        <el-text>{{ lowerTitle }}</el-text>
      </div>
      <div class="exchange-box-lower-main">
        <div class="exchange-box-lower-data rounded-borders margin-box">
          <el-scrollbar class="exchange-box-lower-data-scroll">
            <el-row class="exchange-box-lower-data-scroll-row">
              <template v-for="item in lowerData" :key="item.id">
                <div class="exchange-box-upperLower-data-item">
                  <el-check-tag
                    class="exchange-box-upperLower-data-item-tag"
                    :checked="true"
                    type="danger"
                    @change="handleCheckTagClick(item, 'lowerData')"
                    >{{ item.label }}
                  </el-check-tag>
                </div>
              </template>
            </el-row>
          </el-scrollbar>
        </div>
        <div class="exchange-box-lower-toolbar z-layer-1">
          <SearchToolbar
            :create-button="false"
            :drop-down-search-boxes="lowerDropDownSearchBoxes"
            :main-search-boxes="lowerMainSearchBoxes"
            :reverse="true"
            @search-button-clicked="handleSearchButtonClicked(false)"
            @params-changed="handleLowerSearchToolbarParamsChanged"
          >
          </SearchToolbar>
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
  height: 40%;
}
.exchange-box-upper-name {
  display: flex;
  justify-content: center;
  width: 64px;
  height: 100%;
  writing-mode: vertical-lr;
  background-color: #fdfdfd;
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
.exchange-box-upper-data {
  width: 100%;
  height: calc(100% - 32px);
  background-color: #fdfdfd;
  border-bottom-style: hidden;
  border-left-style: hidden;
}
.exchange-box-upperLower-data-item {
  margin: 1px;
  word-break: break-all;
  word-wrap: break-word;
}
.exchange-box-middle {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 20%;
}
.exchange-box-middle-operation {
  display: flex;
  flex-direction: column;
  width: 64px;
  height: 100%;
}
.exchange-box-middle-confirm {
  width: 64px;
  height: 50%;
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
.exchange-box-middle-clear {
  width: 64px;
  height: 50%;
}
.exchange-box-middle-buffer {
  display: flex;
  flex-direction: row;
  width: calc(100% - 64px);
  height: 100%;
}
.exchange-box-middle-buffer-upper {
  position: relative;
  width: 50%;
  height: 100%;
  background-color: #fdfdfd;
  border-top-color: #e8e8e8;
  border-top-style: dashed;
  border-bottom-style: dotted;
  border-left-style: hidden;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.exchange-box-middle-buffer-lower {
  width: 50%;
  height: 100%;
  background-color: #f6f6f6;
  border-bottom-color: #e8e8e8;
  border-top-style: dotted;
  border-bottom-style: dashed;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.exchange-box-lower {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 40%;
}
.exchange-box-lower-name {
  display: flex;
  justify-content: center;
  width: 64px;
  height: 100%;
  writing-mode: vertical-lr;
  background-color: #f6f6f6;
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
.exchange-box-lower-data {
  width: 100%;
  height: calc(100% - 32px);
  background-color: #f6f6f6;
  border-top-style: hidden;
  border-left-style: hidden;
}
</style>
