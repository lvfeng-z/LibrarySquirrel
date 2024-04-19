<script setup lang="ts">
// 类型
// 搜索项
import { onBeforeMount, Ref, ref, UnwrapRef } from 'vue'
import { SearchBox } from './common/SearchBox'
import DropdownTable from './DropdownTable.vue'

// props
const props = defineProps<{
  mainSearchBoxes: SearchBox[]
  dropDownSearchBoxes: SearchBox[]
}>()

// onBeforeMount
onBeforeMount(() => {
  calculateSpan()
})

// 变量
const searchButtonSpan = ref(3) // 查询按钮的span
const innerMainSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref([]) // 主搜索栏中元素的列表
const innerDropDownSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref([]) // 下拉搜索框中元素的列表
const showDropdownFlag: Ref<UnwrapRef<boolean>> = ref(false) // 暂时废弃

// 方法
// 处理主搜索栏和下拉搜索框
function calculateSpan() {
  let spanRest = 24 - searchButtonSpan.value
  for (const searchBox of props.mainSearchBoxes) {
    // 不更改props属性
    const tempSearchBox = JSON.parse(JSON.stringify(searchBox))

    if (spanRest > 0) {
      // 先减去输入框的长度
      if (tempSearchBox.inputSpan == undefined) {
        tempSearchBox.inputSpan = 5
        spanRest -= tempSearchBox.inputSpan
      } else {
        spanRest -= tempSearchBox.inputSpan
      }

      // 再减去已定义的字段名长度
      if (tempSearchBox.tagSpan == undefined) {
        tempSearchBox.tagSpan = 2
        spanRest -= tempSearchBox.tagSpan
      } else {
        spanRest -= tempSearchBox.tagSpan
      }

      // 空间不足就放进dropDownSearchBoxes
      if (spanRest < 0) {
        innerDropDownSearchBoxes.value.push(tempSearchBox)
      } else {
        innerMainSearchBoxes.value.push(tempSearchBox)
      }
    } else {
      innerDropDownSearchBoxes.value.push(tempSearchBox)
    }
  }

  // 长度不相等，说明有元素被放进dropDownSearchBoxes
  if (innerMainSearchBoxes.value.length != props.mainSearchBoxes.length) {
    console.debug(
      '主搜索栏长度不足以容纳所有mainSearchBoxes元素，不能容纳的元素以被移动至dropDownSearchBoxes'
    )
  }

  const tempDropDownSearchBoxes = JSON.parse(JSON.stringify(props.dropDownSearchBoxes))
  innerDropDownSearchBoxes.value.push(...tempDropDownSearchBoxes)
}

// 展示下拉搜索框
function showDropdown() {
  showDropdownFlag.value = !showDropdownFlag.value
}
</script>

<template>
  <div class="search-toolbar">
    <div class="search-toolbar-wrapper">
      <div class="search-toolbar-main">
        <el-row class="search-toolbar-main-row">
          <template v-for="(item, index) in innerMainSearchBoxes" :key="index">
            <el-col :span="item.tagSpan">
              <el-tag :key="index" size="large">{{ item.label }}</el-tag>
            </el-col>
            <el-col :span="item.inputSpan">
              <el-input></el-input>
            </el-col>
          </template>
          <el-col
            class="search-toolbar-search-button"
            :span="searchButtonSpan"
            style="margin-left: auto"
          >
            <el-dropdown>
              <el-button>搜索</el-button>
              <template v-if="innerDropDownSearchBoxes.length > 0" #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="showDropdown">更多选项</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-col>
        </el-row>
      </div>
    </div>
    <div class="dropdown-menu-wrapper z-layer-2">
      <div class="dropdown-menu">
        <DropdownTable :search-boxes="[]"></DropdownTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-toolbar {
  width: 100%;
  height: calc(32px + 10px);
  display: flex;
  flex-direction: column;
}

.search-toolbar-main-row {
  width: 100%;
}

.search-toolbar-search-button {
  display: flex;
  justify-content: flex-end;
}
.dropdown-menu-wrapper {
  height: 0;
  width: 100%;
}
.dropdown-menu {
  width: 100%;
  height: auto;
}
</style>
