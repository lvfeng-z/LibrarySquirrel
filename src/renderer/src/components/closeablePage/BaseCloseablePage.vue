<script setup lang="ts">
// 事件
const emits = defineEmits(['closeSelf'])

// 方法
function closeSelf() {
  emits('closeSelf')
}
</script>

<template>
  <div class="base-closeable-page">
    <el-button
      class="base-closeable-page-close-button"
      circle
      icon="close"
      color="#b54747"
      @click="closeSelf"
    ></el-button>
    <div class="base-closeable-page-content">
      <slot />
    </div>
    <div class="base-closeable-page-dialog">
      <slot name="dialog" />
    </div>
  </div>
</template>

<style>
.base-closeable-page {
  display: flex;
  width: 100%;
  height: 100%;
  background: white;
  justify-content: center;
  align-items: center;
}
.base-closeable-page-dialog {
  position: absolute;
}
.base-closeable-page-content {
  height: calc(100% - 90px);
  width: calc(100% - 90px);
}
.base-closeable-page-close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  margin: 0;
}
</style>
