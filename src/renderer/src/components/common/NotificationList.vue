<script setup lang="ts">
import CollapsePanel from '@renderer/components/common/CollapsePanel.vue'
import StringUtil from '@renderer/utils/StringUtil.ts'
import { useNotificationStore } from '@renderer/store/UseNotificationStore.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

// model
// 开关状态
const state = defineModel<boolean>('state', { required: true })
const notificationStore = useNotificationStore().$state
</script>

<template>
  <collapse-panel v-model:state="state" :destroy-on-close="true" border-radios="10px" position="right">
    <div class="background-list-container">
      <el-scrollbar>
        <template v-for="item in notificationStore.values()" :key="item.title">
          <div class="background-list-item">
            <span class="background-list-item-title" :title="item.title">{{ item.title }}</span>
            <span v-if="StringUtil.isNotBlank(item.description)" class="background-list-item-description">
              {{ item.description }}
            </span>
            <component :is="item.render()" v-if="NotNullish(item.render)"></component>
          </div>
        </template>
      </el-scrollbar>
    </div>
  </collapse-panel>
</template>

<style scoped>
.background-list-container {
  height: 100%;
  width: 300px;
  background-color: rgb(255, 255, 255, 0.9);
  padding: 5px;
}
.background-list-item {
  display: flex;
  flex-direction: column;
  margin: 5px;
  max-height: 160px;
  border-radius: 10px;
  background-color: var(--el-fill-color);
  padding: 5px;
}
.background-list-item-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 1;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-primary);
  font-size: var(--el-font-size-medium);
}
.background-list-item-description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 1;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-regular);
  font-size: var(--el-font-size-small);
}
</style>
