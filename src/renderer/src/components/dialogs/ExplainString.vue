<script setup lang="ts">
// props
const props = defineProps<{
  stringToExplain: string
}>()
</script>

<template>
  <el-dialog>
    <el-row>
      <label>{{ props.stringToExplain }}</label>
    </el-row>
    <el-row>
      <el-select></el-select>
    </el-row>
  </el-dialog>
</template>

<style scoped></style>
