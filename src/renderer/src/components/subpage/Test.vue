<script setup lang="ts">
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'
</script>

<template>
  <base-subpage>
    <div>
      <div>
        <button class="button">hover me</button>
        <div class="wrapper">
          <div class="detail">
            <div class="content"></div>
          </div>
        </div>
      </div>
      <div>
        <button class="button1">hover me</button>
        <div class="wrapper1">
          <div class="detail1">
            <div class="content1"></div>
          </div>
        </div>
      </div>
    </div>
  </base-subpage>
</template>

<style scoped>
.wrapper {
  width: 200px;
  display: grid;
  grid-template-rows: 0fr;
  transition: 1s;
  background-color: aqua;
  overflow: hidden;
}

.detail {
  min-height: 0;
}

.content {
  height: 200px;
  background-color: #f0dc4e;
}

.button:hover ~ .wrapper {
  grid-template-rows: 1fr;
}

.wrapper1 {
  height: 200px;
  display: grid;
  grid-template-columns: 0fr;
  transition: 1s;
  background-color: aqua;
}
.detail1 {
  min-width: 0;
}

.content1 {
  width: 200px;
  background-color: #f0dc4e;
}

.button1:hover ~ .wrapper1 {
  grid-template-columns: 1fr;
}
</style>
