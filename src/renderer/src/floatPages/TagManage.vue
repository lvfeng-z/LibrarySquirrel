<template>
  <BaseFloatPage>
    <div class="container">
      <div class="left">
        <SearchList :title="'本地tag'" :multi-select="false" :search-api="api1"></SearchList>
      </div>
      <div class="right">
        <div class="right-top">
          <SearchList :multi-select="true" :search-api="api1"></SearchList>
        </div>
        <div class="right-bottom">
          <SearchList :multi-select="true" :search-api="api1"></SearchList>
        </div>
      </div>
    </div>
  </BaseFloatPage>
</template>

<script setup lang="ts">
import BaseFloatPage from './BaseFloatPage.vue'
import SearchList from '../components/SearchList.vue'

const api1 = window.api.tagLocalGetSelectList
</script>

<style>
.container {
  display: flex;
  height: 100%; /* 调整为所需的容器高度 */
}

.left {
  flex: 1;
  height: 100%;
}

.right {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.right-top {
  flex: 1;
  height: 100%;
}

.right-bottom {
  flex: 1;
  height: 100%;
}
</style>
