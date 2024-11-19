<script setup lang="ts">
// 事件
const emits = defineEmits(['closeSelf'])

// 方法
function closeSelf() {
  emits('closeSelf')
}
</script>

<template>
  <div class="base-subpage">
    <el-button class="base-subpage-close-button" circle icon="close" color="#b54747" @click="closeSelf"></el-button>
    <div class="base-subpage-content">
      <slot />
    </div>
    <div class="base-subpage-dialog">
      <slot name="dialog" />
    </div>
  </div>
</template>

<style>
.base-subpage {
  display: flex;
  width: 100%;
  height: 100%;
  background: white;
  justify-content: center;
  align-items: center;
}
.base-subpage-dialog {
  position: absolute;
}
.base-subpage-content {
  height: calc(100% - 65px);
  width: calc(100% - 65px);
  margin-right: 25px;
}
.base-subpage-close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  margin: 0;
}
</style>
