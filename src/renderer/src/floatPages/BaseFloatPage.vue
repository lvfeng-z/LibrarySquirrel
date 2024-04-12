<template>
  <div class="BaseFloatPage">
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
<script setup>
const emits = defineEmits(['close-float-page'])
function closeSelf() {
  emits('close-float-page')
}
</script>

<style>
.BaseFloatPage {
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
  height: 90%;
  width: 90%;
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  margin: 0;
  z-index: 1; /* 确保关闭按钮在层级上位于其他元素之上 */
}
</style>
