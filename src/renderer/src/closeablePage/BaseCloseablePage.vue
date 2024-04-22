<script setup lang="ts">
// 事件
const emits = defineEmits(['close-float-page'])

// 方法
function closeSelf() {
  emits('close-float-page')
}
</script>

<template>
  <div class="BaseCloseablePage">
    <el-button
      class="close-button"
      circle
      icon="close"
      color="#b54747"
      @click="closeSelf"
    ></el-button>
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style>
.BaseCloseablePage {
  display: flex;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: white;
  justify-content: center;
  align-items: center;
}

.content {
  height: calc(100% - 90px);
  width: calc(100% - 90px);
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  margin: 0;
}
</style>
