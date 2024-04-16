<script setup lang="ts">
// 类型
// 搜索项
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

const props = defineProps<{
  mainSearchBoxes: SearchBox[]
  dropDownSearchBoxes: SearchBox[]
}>()
</script>

<template>
  <div class="search-toolbar">
    <div class="search-toolbar-wrapper">
      <el-row>
        <el-col :span="'auto'">
          <el-tag size="large">字段11111111111111111111111111字段11111111111111111111111111</el-tag>
        </el-col>
        <el-col :span="3">
          <el-input></el-input>
        </el-col>
        <el-col :span="3" style="margin-left: auto">
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
}

.search-toolbar-wrapper {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
</style>
