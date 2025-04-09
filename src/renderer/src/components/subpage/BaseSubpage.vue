<script setup lang="ts"></script>

<template>
  <div class="base-subpage">
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
  height: calc(100% - 25px);
  width: calc(100% - 30px);
  margin-left: 5px;
  margin-right: 25px;
}
</style>
