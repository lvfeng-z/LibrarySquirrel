<script setup lang="ts">
// props
const props = defineProps<{
  title: string
  content: string
  buttonText: string
  buttonClick: () => void
}>()

// model
// dialog开关
const state = defineModel<boolean>('state', {
  default: false
})

// 方法
function handleButtonClick() {
  state.value = false
  props.buttonClick()
}
</script>

<template>
  <el-dialog v-model="state" :title="props.title">
    <el-row>
      <span>{{ props.content }}</span>
    </el-row>
    <el-row>
      <el-button @click="handleButtonClick">{{ props.buttonText }}</el-button>
    </el-row>
  </el-dialog>
</template>

<style scoped></style>
