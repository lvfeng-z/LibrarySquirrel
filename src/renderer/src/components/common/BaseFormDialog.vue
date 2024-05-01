<script setup lang="ts">
import { InputBox } from '../../utils/model/InputBox'
// props

const props = defineProps<{
  inputBoxes: InputBox[] // InputBox数组
  reverse?: boolean // 是否翻转DropDownTable（true：翻转，false：不翻转）
}>()
</script>

<template>
  <el-dialog>
    <el-form>
      <slot name="default"></slot>
    </el-form>
  </el-dialog>
</template>

<style scoped></style>
