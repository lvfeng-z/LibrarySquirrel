<script setup lang="ts">
import { SearchBox } from './common/SearchBox'
import { Ref, ref, UnwrapRef } from 'vue'

// props
const props = defineProps<{
  searchBoxes: SearchBox[]
}>()

// 变量
const closed: Ref<UnwrapRef<boolean>> = ref(true)

// 方法
// 开启/关闭下拉表单
function changeState() {
  closed.value = !closed.value
}

// 处理主搜索栏和下拉搜索框
// function calculateSpan() {
//   let spanRest = 24 - searchButtonSpan.value
//   for (const searchBox of props.mainSearchBoxes) {
//     // 不更改props属性
//     const tempSearchBox = JSON.parse(JSON.stringify(searchBox))
//
//     if (spanRest > 0) {
//       // 先减去输入框的长度
//       if (tempSearchBox.inputSpan == undefined) {
//         tempSearchBox.inputSpan = 5
//         spanRest -= tempSearchBox.inputSpan
//       } else {
//         spanRest -= tempSearchBox.inputSpan
//       }
//
//       // 再减去已定义的字段名长度
//       if (tempSearchBox.tagSpan == undefined) {
//         tempSearchBox.tagSpan = 2
//         spanRest -= tempSearchBox.tagSpan
//       } else {
//         spanRest -= tempSearchBox.tagSpan
//       }
//
//       // 空间不足就放进dropDownSearchBoxes
//       if (spanRest < 0) {
//         innerDropDownSearchBoxes.value.push(tempSearchBox)
//       } else {
//         innerMainSearchBoxes.value.push(tempSearchBox)
//       }
//     } else {
//       innerDropDownSearchBoxes.value.push(tempSearchBox)
//     }
//   }
//
//   // 长度不相等，说明有元素被放进dropDownSearchBoxes
//   if (innerMainSearchBoxes.value.length != props.mainSearchBoxes.length) {
//     console.debug(
//       '主搜索栏长度不足以容纳所有mainSearchBoxes元素，不能容纳的元素以被移动至dropDownSearchBoxes'
//     )
//   }
//
//   const tempDropDownSearchBoxes = JSON.parse(JSON.stringify(props.dropDownSearchBoxes))
//   innerDropDownSearchBoxes.value.push(...tempDropDownSearchBoxes)
// }
</script>

<template>
  <div class="dropdown-table">
    <div
      :class="{
        'dropdown-table-main': true,
        'dropdown-table-main-open': !closed,
        'dropdown-table-main-close': closed
      }"
    >
      <el-row>
        <el-col :span="2">
          <el-tag size="large">测试1</el-tag>
        </el-col>
        <el-col :span="5">
          <el-input size="large"></el-input>
        </el-col>
      </el-row>
    </div>
    <div class="dropdown-table-button-wrapper z-layer-2">
      <div class="dropdown-table-button" @click="changeState"></div>
    </div>
  </div>
</template>

<style scoped>
.dropdown-table{
  width: 100%;
  position: relative;
}
.dropdown-table-main {
  width: 100%;
  transition: height 0.1s ease;
  overflow: hidden;
}
.dropdown-table-main-open {
  height: 500px;
}
.dropdown-table-main-close {
  height: 0;
}
.dropdown-table-button-wrapper {
  display: grid;
  align-content: end;
  position: absolute;
  left: calc(50% - 40px);
  width: 80px;
  height: 13px;
  overflow: hidden;
}
.dropdown-table-button {
  width: 80px;
  height: 30px;
  border-radius: 100% / 100%;
  background-image: linear-gradient(135deg, #001f3f, #0088a9, #00c9a7, #92d5c6, #ebf5ee);
}
</style>
