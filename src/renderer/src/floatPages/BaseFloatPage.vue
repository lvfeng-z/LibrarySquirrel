<template>
  <div class="BaseFloatPage">
    <div class="top-bar">
      <div>
        <el-button
          class="close-button"
          circle
          icon="close"
          color="#b54747"
          @click="closeSelf"
        ></el-button>
      </div>
    </div>
    <div class="main-space">
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: white;
}

.top-bar {
  height: 10%;
}

.main-space {
  height: auto;
}

.close-button {
  top: 16px;
  right: 16px;
  margin: 0;
  z-index: 1; /* 确保关闭按钮在层级上位于其他元素之上 */
}
</style>
