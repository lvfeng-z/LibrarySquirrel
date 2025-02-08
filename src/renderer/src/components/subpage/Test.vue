<script setup lang="ts">
</script>

<template>
  <div>
    <button class="button">hover me</button>
    <div class="wrapper">
      <div class="content"></div>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  width: 0;
  overflow: hidden;
  transition: width 1s;
}

.content {
  width: 200px;
  height: 100px;
  background-color: #f0dc4e;
}

.button:hover ~ .wrapper {
  width: auto;
}
</style>
