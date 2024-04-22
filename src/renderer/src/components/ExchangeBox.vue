<script setup lang="ts">
import SearchToolbar from './SearchToolbar.vue'
import { SearchBox } from './common/SearchBox'
import { Ref, ref, UnwrapRef } from 'vue'

// props
const props = defineProps<{
  upperMainSearchBoxes: SearchBox[]
  upperDropDownSearchBoxes: SearchBox[]
  lowerMainSearchBoxes: SearchBox[]
  lowerDropDownSearchBoxes: SearchBox[]
  upperSearchApi: (args: object) => Promise<never>
  lowerSearchApi: (args: object) => Promise<never>
}>()

// 变量
const upperSearchToolbarParams = ref({}) // upper搜索栏参数
const lowerSearchToolbarParams = ref({}) // lower搜索栏参数
const upperData: Ref<UnwrapRef<unknown[]>> = ref([]) // upper的数据
const lowerData: Ref<UnwrapRef<unknown[]>> = ref([]) // lower的数据

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
  if (upperOrLower) {
    const params = { ...upperSearchToolbarParams.value }
    upperData.value = await props.upperSearchApi(params)
  } else {
    const params = { ...lowerSearchToolbarParams.value }
    lowerData.value = await props.lowerSearchApi(params)
  }
}
</script>

<template>
  <div class="exchange-box">
    <div class="exchange-box-upper">
      <div class="exchange-box-upper-name"></div>
      <div class="exchange-box-upper-main">
        <div class="exchange-box-upper-toolbar">
          <SearchToolbar
            :create-button="false"
            :drop-down-search-boxes="[]"
            :main-search-boxes="[]"
            @search-button-clicked="handleSearchButtonClicked(true)"
            @params-changed="handleUpperSearchToolbarParamsChanged"
          >
          </SearchToolbar>
        </div>
        <div class="exchange-box-upper-data"></div>
      </div>
    </div>
    <div class="exchange-box-middle">
      <div class="exchange-box-middle-confirm"></div>
      <div class="exchange-box-middle-buffer">
        <div class="exchange-box-middle-buffer-upper"></div>
        <div class="exchange-box-middle-buffer-lower"></div>
      </div>
    </div>
    <div class="exchange-box-lower">
      <div class="exchange-box-lower-name"></div>
      <div class="exchange-box-lower-main">
        <div class="exchange-box-lower-data"></div>
        <div class="exchange-box-lower-toolbar">
          <SearchToolbar
            :create-button="false"
            :drop-down-search-boxes="[]"
            :main-search-boxes="[]"
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
  width: 64px;
  height: 100%;
  background-color: #92d5c6;
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
  background-color: #ededed;
}
.exchange-box-middle {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 20%;
}
.exchange-box-middle-confirm {
  width: 64px;
  height: 100%;
  background-color: crimson;
}
.exchange-box-middle-buffer {
  display: flex;
  flex-direction: row;
  width: calc(100% - 64px);
  height: 100%;
}
.exchange-box-middle-buffer-upper {
  width: 50%;
  height: 100%;
  background-color: #ededed;
}
.exchange-box-middle-buffer-lower {
  width: 50%;
  height: 100%;
  background-color: #dadada;
}
.exchange-box-lower {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 40%;
}
.exchange-box-lower-name {
  width: 64px;
  height: 100%;
  background-color: #92d5c6;
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
  background-color: #dadada;
}
</style>
