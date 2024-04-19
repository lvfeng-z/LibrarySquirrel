<script setup lang="ts">
import { ref } from 'vue'

// 变量
const isCollapsed = ref(true)

// 方法
function toggleAside(status: boolean) {
  isCollapsed.value = status

  // 如果需要在其他地方同步更新菜单状态，可以考虑使用事件总线（EventBus）、Vuex状态管理或组件通信方式
}
</script>

<template>
  <div class="side-menu">
    <el-menu class="side-menu-main" :collapse="isCollapsed">
      <div class="side-menu-button-wrapper">
        <div class="side-menu-button-wrapper-upper">
          <div class="side-menu-button-upper side-menu-button" @click.once="toggleAside(false)"></div>
        </div>
        <div class="side-menu-button-wrapper-lower">
          <div class="side-menu-button-lower side-menu-button" @click.once="toggleAside(true)"></div>
        </div>
      </div>
      <slot name="default"></slot>
    </el-menu>
  </div>
</template>

<style scoped>
.side-menu {
  height: 100%;
}
.side-menu-main {
  width: 63px;
  height: 100%;
  min-height: calc(88.3vh);
}
.side-menu-main:not(.el-menu--collapse) {
  width: 200px;
  height: 100%;
}
.side-menu-button-wrapper {
  position: absolute;
  width: 20px;
  height: 102px;
  right: -20px;
  top: calc(50% - 51px);
}
.side-menu-button-wrapper-upper {
  width: 20px;
  height: 51px;
  right: -20px;
  top: 45%;
  overflow: hidden; /* 隐藏超出边界的部分 */
  direction: rtl;
  border-bottom: 1px solid #eeeeee;
}
.side-menu-button-upper {
  width: 40px;
  height: 100px;
  border-radius: 100% / 100%;
  background-color: darkgrey;
}
.side-menu-button-wrapper-lower {
  width: 20px;
  height: 51px;
  right: -20px;
  top: 45%;
  overflow: hidden; /* 隐藏超出边界的部分 */
  display: grid;
  align-content: end;
  justify-content: start;
  direction: rtl;
  border-top: 1px solid #eeeeee;
}
.side-menu-button-lower {
  width: 40px;
  height: 100px;
  border-radius: 100% / 100%;
  background-color: darkgrey;
}
.side-menu-button:hover {
  background-color: lavender;
}
</style>
