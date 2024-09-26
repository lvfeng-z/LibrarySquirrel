<script setup lang="ts">
import SearchToolbar from './SearchToolbar.vue'
import InputBox from '../../model/util/InputBox'
import { computed, Ref, ref, UnwrapRef } from 'vue'
import SelectItem from '../../model/util/SelectItem'
import ApiUtil from '../../utils/ApiUtil'
import ApiResponse from '../../model/util/ApiResponse'
import PageModel from '../../model/util/PageModel'
import lodash from 'lodash'
import BaseQueryDTO from '../../model/main/queryDTO/BaseQueryDTO.ts'
import TagBox from './TagBox.vue'
import { isNullish, notNullish } from '../../utils/CommonUtil'

// props
const props = defineProps<{
  upperTitle: string // upper的标题
  lowerTitle: string // lower的标题
  upperMainInputBoxes?: InputBox[] // upper的SearchToolbar的主菜单参数
  upperDropDownInputBoxes?: InputBox[] // upper的SearchToolbar的下拉菜单参数
  lowerMainInputBoxes?: InputBox[] // lower的SearchToolbar的主菜单参数
  lowerDropDownInputBoxes?: InputBox[] // lower的SearchToolbar的下拉菜单参数
  upperSearchApi: (args: object) => Promise<never> // upper的接口
  lowerSearchApi: (args: object) => Promise<never> // lower的接口
  upperApiStaticParams: object // upper的接口固定参数
  lowerApiStaticParams: object // lower的接口固定参数
  requiredStaticParams?: string // 必备的固定参数，固定参数中，此参数为undefined时禁用搜索按钮
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
const upperPageConfig: Ref<UnwrapRef<PageModel<BaseQueryDTO, object>>> = ref(
  new PageModel<BaseQueryDTO, object>()
) // upper搜索栏分页参数
const lowerPageConfig: Ref<UnwrapRef<PageModel<BaseQueryDTO, object>>> = ref(
  new PageModel<BaseQueryDTO, object>()
) // lower搜索栏分页参数
const upperData: Ref<UnwrapRef<SelectItem[]>> = ref([]) // upper的数据
const lowerData: Ref<UnwrapRef<SelectItem[]>> = ref([]) // lower的数据
const upperTagBox = ref() // upperTagBox组件的实例
const lowerTagBox = ref() // lowerTagBox组件的实例
// upper加载更多开关
const upperLoadMore: Ref<UnwrapRef<boolean>> = computed(() => {
  if (notNullish(upperTagBox.value)) {
    return upperPageConfig.value.pageNumber < upperPageConfig.value.pageCount
  } else {
    return false
  }
})
// lower加载更多开关
const lowerLoadMore: Ref<UnwrapRef<boolean>> = computed(() => {
  if (notNullish(lowerTagBox.value)) {
    return lowerPageConfig.value.pageNumber < lowerPageConfig.value.pageCount
  } else {
    return false
  }
})
const upperBufferData: Ref<UnwrapRef<SelectItem[]>> = ref([]) // upperBuffer的数据
const upperBufferId: Ref<UnwrapRef<Set<number | string>>> = ref(new Set<string>()) // upperBuffer的数据Id
const lowerBufferData: Ref<UnwrapRef<SelectItem[]>> = ref([]) // lowerBuffer的数据
const lowerBufferId: Ref<UnwrapRef<Set<number | string>>> = ref(new Set<string>()) // lowerBuffer的数据Id
// 是否禁用搜索按钮(检查props.upperApiStaticParams的props.requiredStaticParams属性是否为undefined)
const searchButtonDisabled = computed(() =>
  isNullish(props.requiredStaticParams)
    ? false
    : !(
        Object.prototype.hasOwnProperty.call(
          props.upperApiStaticParams,
          props.requiredStaticParams
        ) && props.upperApiStaticParams[props.requiredStaticParams] != undefined
      )
)

// 方法
// 请求查询接口
async function requestApiAndGetData(upperOrLower: boolean): Promise<SelectItem[] | undefined> {
  // 请求api
  let response: ApiResponse
  if (upperOrLower) {
    upperPageConfig.value.query = {
      ...new BaseQueryDTO(),
      ...upperSearchToolbarParams.value,
      ...props.upperApiStaticParams
    }
    const tempPage = lodash.cloneDeep(upperPageConfig.value)
    response = await props.upperSearchApi(tempPage)
  } else {
    lowerPageConfig.value.query = {
      ...new BaseQueryDTO(),
      ...lowerSearchToolbarParams.value,
      ...props.lowerApiStaticParams
    }
    const tempPage = lodash.cloneDeep(lowerPageConfig.value)
    response = await props.lowerSearchApi(tempPage)
  }

  // 解析并返回数据，同时把分页参数赋值给响应式变量
  if (ApiUtil.apiResponseCheck(response)) {
    const page = ApiUtil.apiResponseGetData(response) as PageModel<BaseQueryDTO, SelectItem>
    if (upperOrLower) {
      upperPageConfig.value = new PageModel(page)
    } else {
      lowerPageConfig.value = new PageModel(page)
    }
    return page.data === undefined ? [] : page.data
  } else {
    ApiUtil.apiResponseMsg(response)
    return undefined
  }
}
// 处理搜索按钮点击事件
async function handleSearchButtonClicked(upperOrLower: boolean) {
  // 点击搜索按钮后，分页和滚动条位置重置
  if (upperOrLower) {
    upperPageConfig.value = new PageModel<BaseQueryDTO, object>()
  } else if (!upperOrLower) {
    lowerPageConfig.value = new PageModel<BaseQueryDTO, object>()
  }
  resetScrollBarPosition(upperOrLower)

  const newData = await requestApiAndGetData(upperOrLower)

  if (newData) {
    const leached = leachBufferData(newData, upperOrLower)
    if (upperOrLower) {
      upperData.value = leached
    } else {
      lowerData.value = leached
    }
  }
}
// 处理check-tag点击事件
function handleCheckTagClick(
  tag: SelectItem,
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
  upperPageConfig.value = new PageModel()
  lowerBufferData.value = []
  lowerBufferId.value.clear()
  lowerPageConfig.value = new PageModel()
  resetScrollBarPosition()

  requestApiAndGetData(true).then((response) => {
    upperData.value = response == undefined ? [] : response
  })
  requestApiAndGetData(false).then((response) => {
    lowerData.value = response == undefined ? [] : response
  })
}
// 请求DataScroll下一页数据
async function requestNextPage(upperOrLower: boolean) {
  // 加载下一页数据
  if (upperOrLower) {
    if (upperPageConfig.value.pageNumber >= upperPageConfig.value.pageCount) {
      return
    }
    upperPageConfig.value.pageNumber++
  } else {
    if (lowerPageConfig.value.pageNumber >= lowerPageConfig.value.pageCount) {
      return
    }
    lowerPageConfig.value.pageNumber++
  }

  // 请求接口
  let increment = await requestApiAndGetData(upperOrLower)
  // 在原有数据的基础上增加新数据，如果没请求到数据，则将分页重置回原来的状态
  if (notNullish(increment) && increment.length > 0) {
    increment = leachBufferData(increment, upperOrLower)
    if (upperOrLower) {
      upperData.value = [...upperData.value, ...increment]
    } else {
      lowerData.value = [...lowerData.value, ...increment]
    }
  } else {
    if (upperOrLower) {
      upperPageConfig.value.pageNumber--
    } else {
      lowerPageConfig.value.pageNumber--
    }
  }
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
        <el-text>{{ upperTitle }}</el-text>
      </div>
      <div class="exchange-box-upper-main">
        <div class="exchange-box-upper-toolbar z-layer-1">
          <SearchToolbar
            :create-button="false"
            :drop-down-input-boxes="upperDropDownInputBoxes"
            :main-input-boxes="upperMainInputBoxes"
            :search-button-disabled="searchButtonDisabled"
            :params="upperSearchToolbarParams"
            @search-button-clicked="handleSearchButtonClicked(true)"
          >
          </SearchToolbar>
        </div>
        <tag-box
          ref="upperTagBox"
          v-model:data-list="upperData"
          class="exchange-box-upper-tag-box"
          :load="() => requestNextPage(true)"
          :has-next-page="upperLoadMore"
          @tag-left-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'upperData')"
          @tag-right-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'upperData')"
        />
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
          >
            确认
          </el-check-tag>
        </div>
        <div class="exchange-box-middle-clear">
          <el-check-tag
            :checked="false"
            class="exchange-box-middle-clear-button"
            type="info"
            @click="handleClearButtonClicked"
          >
            清空
          </el-check-tag>
        </div>
      </div>
      <div class="exchange-box-middle-buffer">
        <tag-box
          v-model:data-list="upperBufferData"
          class="exchange-box-middle-buffer-upper"
          @tag-left-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'upperBuffer')"
          @tag-right-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'upperBuffer')"
        />
        <tag-box
          v-model:data-list="lowerBufferData"
          class="exchange-box-middle-buffer-lower"
          @tag-left-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'lowerBuffer')"
          @tag-right-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'lowerBuffer')"
        />
      </div>
    </div>
    <div class="exchange-box-lower">
      <div class="exchange-box-lower-name">
        <el-text>{{ lowerTitle }}</el-text>
      </div>
      <div class="exchange-box-lower-main">
        <tag-box
          ref="lowerTagBox"
          v-model:data-list="lowerData"
          class="exchange-box-lower-tag-box"
          :load="() => requestNextPage(false)"
          :has-next-page="lowerLoadMore"
          @tag-left-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'lowerData')"
          @tag-right-clicked="(tag: SelectItem) => handleCheckTagClick(tag, 'lowerData')"
        />
        <div class="exchange-box-lower-toolbar z-layer-1">
          <SearchToolbar
            :create-button="false"
            :drop-down-input-boxes="lowerDropDownInputBoxes"
            :main-input-boxes="lowerMainInputBoxes"
            :reverse="true"
            :search-button-disabled="searchButtonDisabled"
            :params="lowerSearchToolbarParams"
            @search-button-clicked="handleSearchButtonClicked(false)"
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
  height: calc(100% - 32px);
  background-color: #ffffff;
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
  background-color: #ffffff;
  border-top-width: 1px;
  border-top-style: dashed;
  border-bottom-width: 1px;
  border-bottom-style: dotted;
  border-right-width: 1px;
  border-right-style: dotted;
  border-color: #bfbfbf;
  box-sizing: border-box;
}
.exchange-box-middle-buffer-lower {
  width: 50%;
  height: 100%;
  background-color: #fbfbfb;
  border-top-width: 1px;
  border-top-style: dotted;
  border-bottom-width: 1px;
  border-bottom-style: dashed;
  border-left-width: 1px;
  border-left-style: dotted;
  border-right-width: 1px;
  border-right-style: dotted;
  border-color: #bfbfbf;
  box-sizing: border-box;
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
  height: calc(100% - 32px);
  background-color: #fbfbfb;
}
</style>
