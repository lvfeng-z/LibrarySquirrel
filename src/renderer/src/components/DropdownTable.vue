<script setup lang="ts">
import { SearchBox } from './common/SearchBox'
import { onBeforeMount, Ref, ref, UnwrapRef, watch } from "vue";
import ScrollTextBox from './ScrollTextBox.vue'

// props
const props = withDefaults(
  defineProps<{
    state: boolean
    searchBoxes: SearchBox[] // SearchBox数组
    reverse?: boolean
  }>(),
  {
    reverse: false
  }
)

// onBeforeMount
onBeforeMount(() => {
  calculateSpan()
})

// 事件
const emits = defineEmits(['paramsChanged'])

// 变量
const state: Ref<UnwrapRef<boolean>> = ref(false) // 开关状态
const searchBoxInRow: Ref<UnwrapRef<SearchBox[][]>> = ref([]) // searchBox分行数组
const dropdownTableHeight = ref(0) // 弃用 所有行占用的高度
const formData = ref({})

// watch
// 监听父组件的下拉框开关状态变化
watch(
  () => props.state,
  (newValue) => {
    state.value = newValue;
  }
);

// 方法
// 开启/关闭下拉表单
function changeState() {
  state.value = !state.value
}

// 处理searchBox布局
function calculateSpan() {
  // 一行的高度
  const rowHeight = 42
  let height = 0
  // 用于计算当前行在插入box之后还剩多少span
  let spanRest = 24
  // 临时用于储存行信息的数组
  let tempRow: SearchBox[] = []
  searchBoxInRow.value.push(tempRow)
  height += rowHeight

  // 遍历box数组，处理如何分布这些box
  for (const searchBox of props.searchBoxes) {
    // 储存当前box的长度
    let boxSpan = 0
    // 不更改props属性
    const tempSearchBox: SearchBox = JSON.parse(JSON.stringify(searchBox))
    // 未设置tag长度则设置为2
    if (tempSearchBox.labelSpan == undefined) {
      tempSearchBox.labelSpan = 2
    }
    // 未设置input长度则设置为6
    if (tempSearchBox.inputSpan == undefined) {
      tempSearchBox.inputSpan = 4
    }

    // 判断是否能够容纳此box
    boxSpan += tempSearchBox.labelSpan + tempSearchBox.inputSpan
    spanRest -= boxSpan

    // 能容纳则放进tempRow，否则tempRow指向新空数组，再放进tempRow
    if (spanRest >= 0) {
      tempRow.push(tempSearchBox)
    } else {
      tempRow = []
      searchBoxInRow.value.push(tempRow)
      height += rowHeight
      tempRow.push(tempSearchBox)
      spanRest = 24 - boxSpan
    }
  }

  // 计算完的高度赋值
  dropdownTableHeight.value = height
}

// 用户输入改变时，发送paramsChanged事件
function handleParamsChanged() {
  emits('paramsChanged', formData.value)
}
</script>

<template>
  <div class="dropdown-table">
    <div
      :class="{
        'dropdown-table-main': true,
        'dropdown-table-main-open': state,
        'dropdown-table-main-close': !state,
        'margin-box':
          state /*此处在组件内部进行边缘缩进，因为在外部边缘缩进会导致侧边按钮很难与调用者的边框适配*/
      }"
    >
      <el-scrollbar class="dropdown-table-rows">
        <el-form v-model="formData" @input="handleParamsChanged">
          <template v-for="(boxRow, boxRowindex) in searchBoxInRow" :key="boxRowindex">
            <el-row class="dropdown-table-row">
              <template v-for="(item, index) in boxRow" :key="index">
                <el-col class="dropdown-table-label" :span="item.labelSpan">
                  <div
                    :key="boxRowindex + '-' + index"
                    class="dropdown-table-label-scroll-text-wrapper el-tag-mimic"
                    style="width: 100%"
                  >
                    <ScrollTextBox>{{ item.label }}</ScrollTextBox>
                  </div>
                </el-col>
                <el-col class="dropdown-table-input" :span="item.inputSpan">
                  <el-form-item>
                    <el-input v-model="formData[item.name]"></el-input>
                  </el-form-item>
                </el-col>
              </template>
            </el-row>
          </template>
        </el-form>
      </el-scrollbar>
    </div>
    <div
      :class="{
        'dropdown-table-button-wrapper': true,
        'dropdown-table-button-wrapper-normal': !reverse,
        'dropdown-table-button-wrapper-reverse': reverse,
        'z-layer-2': true
      }"
    >
      <div class="dropdown-table-button" @click="changeState"></div>
    </div>
  </div>
</template>

<style scoped>
.dropdown-table {
  width: 100%;
  position: relative;
}
.dropdown-table-main {
  transition: height 0.1s ease;
  overflow: hidden;
}
.dropdown-table-main-open {
  height: 105px;
}
.dropdown-table-main-close {
  height: 0;
}
.dropdown-table-row {
  height: 32px;
  margin-top: 3px;
}
.dropdown-table-label {
  height: 100%;
  display: flex;
  justify-content: flex-end;
}
.dropdown-table-input {
  display: flex;
  justify-content: flex-start;
}
.dropdown-table-button-wrapper {
  position: absolute;
  left: calc(50% - 40px);
  width: 80px;
  height: 13px;
  overflow: hidden;
}
.dropdown-table-button-wrapper-normal {
  display: grid;
  align-content: end;
  top: 100%;
}
.dropdown-table-button-wrapper-reverse {
  top: -13px;
}
.dropdown-table-button {
  width: 80px;
  height: 30px;
  border-radius: 100% / 100%;
  background-image: linear-gradient(135deg, #001f3f, #0088a9, #00c9a7, #92d5c6, #ebf5ee);
}
.dropdown-table-rows {
  flex-direction: column;
  width: 100%;
}
</style>
