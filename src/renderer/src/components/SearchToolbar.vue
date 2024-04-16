<script setup lang="ts"></script>

<template>
  <div class="search-toolbar">
    <div class="search-toolbar-wrapper"></div>
  </div>
</template>

<style scoped>
.search-toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.search-toolbar-wrapper {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  display: flex;
  flex-direction: column;
}
</style>
