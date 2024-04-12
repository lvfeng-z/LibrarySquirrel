<template>
  <BaseFloatPage>
    <div class="container">
      <div class="left">
<!--        <SearchList remote-search-fn="" data=""></SearchList>-->
      </div>
      <div class="right">
        <div class="right-top">
<!--          <SearchList remote-search-fn="" data=""></SearchList>-->
        </div>
        <div class="right-bottom">
<!--          <SearchList remote-search-fn="" data=""></SearchList>-->
        </div>
      </div>
    </div>
  </BaseFloatPage>
</template>

<script setup>
import BaseFloatPage from './BaseFloatPage.vue'
import SearchList from '../components/SearchList.vue'
</script>

<style>
.container {
  display: flex;
  height: 100vh; /* 调整为所需的容器高度 */
}

.left {
  flex: 1;
  border: 1px solid red; /* 仅为示例，可删除或更改边框样式 */
}

.right {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.right-top {
  flex: 1;
  border: 1px solid blue; /* 仅为示例，可删除或更改边框样式 */
}

.right-bottom {
  flex: 1;
  border: 1px solid green; /* 仅为示例，可删除或更改边框样式 */
}
</style>
