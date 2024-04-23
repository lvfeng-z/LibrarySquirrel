<script setup lang="ts">
import SearchToolbar from './SearchToolbar.vue'
import { SearchBox } from './common/SearchBox'
import { Ref, ref, UnwrapRef } from 'vue'
import { SelectOption } from './common/SelectOption'

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
const upperData: Ref<UnwrapRef<SelectOption[]>> = ref([]) // upper的数据
const lowerData: Ref<UnwrapRef<SelectOption[]>> = ref([]) // lower的数据
const upperSelected: Ref<UnwrapRef<SelectOption>[]> = ref([]) // upper被选中的数据
const lowerSelected: Ref<UnwrapRef<SelectOption>[]> = ref([]) // lower被选中的数据

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
    console.log(upperData.value)
  } else {
    const params = { ...lowerSearchToolbarParams.value }
    lowerData.value = await props.lowerSearchApi(params)
  }
}
</script>

<template>
  <div class="exchange-box">
    <div class="exchange-box-upper">
      <div class="exchange-box-upper-name rounded-borders">
        <el-text>已绑定站点标签</el-text>
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
        <div class="exchange-box-upper-data rounded-borders">
          <div class="margin-box">
            <el-checkbox-group v-model="upperSelected" class="exchange-box-upper-data-checkbox">
              <el-checkbox v-for="(item, index) in upperData" :key="index" :value="item.value">
                <el-tag>{{ item.label }}</el-tag>
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </div>
    <div class="exchange-box-middle">
      <div class="exchange-box-middle-operation">
        <div class="exchange-box-middle-confirm">
          <el-button class="exchange-box-middle-confirm-button"></el-button>
        </div>
        <div class="exchange-box-middle-clear">
          <el-button class="exchange-box-middle-clear-button"></el-button>
        </div>
      </div>
      <div class="exchange-box-middle-buffer">
        <div class="exchange-box-middle-buffer-upper"></div>
        <div class="exchange-box-middle-buffer-lower"></div>
      </div>
    </div>
    <div class="exchange-box-lower">
      <div class="exchange-box-lower-name rounded-borders">
        <el-text>未绑定站点标签</el-text>
      </div>
      <div class="exchange-box-lower-main">
        <div class="exchange-box-lower-data rounded-borders">
          <div class="margin-box">
            <el-checkbox-group v-model="lowerSelected" class="exchange-box-lower-data-checkbox">
              <el-checkbox v-for="(item, index) in lowerData" :key="index" :value="item.value">
                <el-tag>{{ item.label }}</el-tag>
              </el-checkbox>
            </el-checkbox-group>
          </div>
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
}
.exchange-box-upper-data-checkbox {
  width: 100%;
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
}
.exchange-box-middle-clear-button {
  width: 100%;
  height: 100%;
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
  width: 50%;
  height: 100%;
  background-color: #fdfdfd;
}
.exchange-box-middle-buffer-lower {
  width: 50%;
  height: 100%;
  background-color: #f6f6f6;
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
}
.exchange-box-lower-data-checkbox {
  width: 100%;
}
</style>
