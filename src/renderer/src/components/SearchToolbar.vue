<script setup lang="ts">
// 类型
// 搜索项
import { onBeforeMount, Ref, ref, UnwrapRef } from 'vue'

export interface SearchBox {
  name: string // 字段名
  label: string // 标题名称
  inputType: string // 输入组件类型
  dataType: string // 数据类型
  placeholder: string // 占位符
  inputSpan?: number // 输入组件宽度
  tagSpan?: number // 名称tag宽度
  showLabel?: boolean // 是否展示标题
}

// props
const props = defineProps<{
  mainSearchBoxes: SearchBox[]
  dropDownSearchBoxes: SearchBox[]
}>()

// 变量
const searchButtonSpan = ref(3)
const innerMainSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref([])
const innerDropDownSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref([])

// 方法
// 处理主搜索栏和下拉搜索框
function calculateSpan() {
  let spanRest = 24 - searchButtonSpan.value
  for (const searchBox of props.mainSearchBoxes) {
    if (spanRest > 0) {
      // 先减去输入框的长度
      if (searchBox.inputSpan == undefined) {
        searchBox.inputSpan = 5
        spanRest -= searchBox.inputSpan
      } else {
        spanRest -= searchBox.inputSpan
      }

      // 再减去已定义的字段名长度
      if (searchBox.tagSpan == undefined) {
        searchBox.tagSpan = 2
        spanRest -= searchBox.tagSpan
      } else {
        spanRest -= searchBox.tagSpan
      }

      // 空间不足就放进dropDownSearchBoxes
      if (spanRest < 0) {
        innerDropDownSearchBoxes.value.push(searchBox)
      } else {
        innerMainSearchBoxes.value.push(searchBox)
      }
    } else {
      innerDropDownSearchBoxes.value.push(searchBox)
    }
  }

  // 长度不相等，说明有元素被放进dropDownSearchBoxes
  if (innerMainSearchBoxes.value.length != props.mainSearchBoxes.length) {
    console.debug(
      '主搜索栏长度不足以容纳所有mainSearchBoxes元素，不能容纳的元素以被移动至dropDownSearchBoxes'
    )
  }
}

// onBeforeMount
onBeforeMount(() => {
  calculateSpan()
})
</script>

<template>
  <div class="search-toolbar">
    <div class="search-toolbar-wrapper">
      <el-row>
        <template v-for="(item, index) in innerMainSearchBoxes" :key="index">
          <el-col :span="item.tagSpan">
            <el-tag size="large">{{ item.label }}</el-tag>
          </el-col>
          <el-col :span="item.inputSpan">
            <el-input></el-input>
          </el-col>
        </template>
        <el-col :span="searchButtonSpan" style="margin-left: auto">
          <el-button>搜索</el-button>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
.search-toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.search-toolbar-wrapper {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
</style>
