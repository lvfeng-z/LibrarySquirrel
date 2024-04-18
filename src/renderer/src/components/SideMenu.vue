<template>
  <div class="side-menu">
    <el-menu :default-openeds="['1']" class="el-menu-vertical-demo" :collapse="isCollapsed">
      <div class="aside-control-button" @click.once="toggleAside">
        <label class="el-icon-caret-left">{{ isCollapsed ? '>' : '<' }}</label>
      </div>
      <slot name="default"></slot>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isCollapsed = ref(true)

function toggleAside() {
  isCollapsed.value = !isCollapsed.value

  // 如果需要在其他地方同步更新菜单状态，可以考虑使用事件总线（EventBus）、Vuex状态管理或组件通信方式
}
</script>

<style scoped>
.aside-control-button {
  position: absolute;
  width: 25px;
  height: 80px;
  background-color: rgba(232, 232, 232, 0.53);
  right: -22px;
  top: 45%;
  /*perspective：对元素进行透视操作*/
  /*rotateX：以y轴（横轴）进行旋转（前后仰俯）
  画个梯形出来*/
  transform: perspective(2em) rotateY(58deg);
  text-align: center;
  line-height: 80px;
  color: #909399;
  background-color: #a6cc9d;
  z-index: 1;
}
.aside-control-button:hover {
  background-color: #d0ffc5;
}
.side-menu {
  height: 100%;
}
.el-menu-vertical-demo {
  width: 0;
  height: 100%;
  min-height: calc(88.3vh);
}
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  height: 100%;
}
</style>
