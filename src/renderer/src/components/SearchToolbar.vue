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
        <el-row>
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
      <div class="sideMenu z-layer-1"></div>
      <div v-show="showDropdownFlag" class="search-toolbar-dropdown z-layer-1">
        <el-row>
          <el-col :span="3">
            <el-tag size="large">test3123</el-tag>
          </el-col>
          <el-col :span="3">
            <el-input></el-input>
          </el-col>
        </el-row>
      </div>
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

.search-toolbar-dropdown {
  top: calc(100% + 10px); /* 调整为与搜索框底部对齐 */
  width: 100%; /* 调整宽度以适应屏幕 */
  background-color: white; /* 可视化调整，可按需自定义 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* 可视化调整，可按需自定义 */
}

/* 为 .search-toolbar-dropdown 添加动画效果（可选）
.search-toolbar-dropdown-enter-active,
.search-toolbar-dropdown-leave-active {
  transition: opacity 0.3s;
}
.search-toolbar-dropdown-enter-from,
.search-toolbar-dropdown-leave-to {
  opacity: 0;
}
 */

.search-toolbar-search-button {
  display: flex;
  justify-content: flex-end;
}
.sideMenu {
  position: absolute;
  height: 100%;
}
</style>
